import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname( fileURLToPath( import.meta.url ) );
const repoRoot = resolve( __dirname, '../../..' );

const defaults = {
    sourceRemote: process.env.SOURCE_REMOTE || 'upstream',
    sourceBranch: process.env.SOURCE_BRANCH || 'dev',
    mirrorBranch: process.env.MIRROR_BRANCH || 'dev',
    automationBranch: process.env.AUTOMATION_BRANCH || 'automation/upstream-master-sync',
    customBranch: process.env.CUSTOM_BRANCH || 'skycms/main'
};

const args = process.argv.slice( 2 );

if ( args.length === 0 || args.includes( '--help' ) || args.includes( '-h' ) ) {
    printHelp();
    process.exit( 0 );
}

const command = args[0];
const options = parseOptions( args.slice( 1 ) );

try {
    if ( command === 'status' ) {
        cmdStatus();
    } else if ( command === 'sync-upstream' ) {
        cmdSyncUpstream();
    } else if ( command === 'prepare-sync-branch' ) {
        cmdPrepareSyncBranch();
    } else if ( command === 'merge-into-skycms' ) {
        cmdMergeIntoSkyCms();
    } else if ( command === 'run-all' ) {
        cmdRunAll();
    } else {
        fail( `Unknown command: ${ command }` );
    }
} catch ( error ) {
    fail( error.message || String( error ) );
}

function cmdRunAll() {
    // End-to-end automation: mirror sync -> automation branch refresh -> optional custom merge.
    cmdSyncUpstream();
    cmdPrepareSyncBranch();

    if ( hasFlag( 'merge' ) ) {
        cmdMergeIntoSkyCms();
    } else {
        console.log( 'Skipping merge-into-skycms (pass --merge to include it).' );
    }
}

function cmdStatus() {
    ensureGitRepo();

    const sourceRef = `${ getOption( 'source-remote', defaults.sourceRemote ) }/${ getOption( 'source-branch', defaults.sourceBranch ) }`;
    const mirrorRef = getOption( 'mirror-branch', defaults.mirrorBranch );
    const automationRef = getOption( 'automation-branch', defaults.automationBranch );
    const customRef = getOption( 'custom-branch', defaults.customBranch );

    console.log( '=== Upstream Sync Status ===' );
    console.log( `Source:     ${ sourceRef }` );
    console.log( `Mirror:     ${ mirrorRef }` );
    console.log( `Automation: ${ automationRef }` );
    console.log( `Custom:     ${ customRef }` );
    console.log( '' );

    if ( branchExists( sourceRef ) && branchExists( mirrorRef ) ) {
        printAheadBehind( mirrorRef, sourceRef, `${ mirrorRef } vs ${ sourceRef }` );
    } else {
        console.log( `Skipping: ${ mirrorRef } vs ${ sourceRef } (missing ref)` );
    }

    if ( branchExists( mirrorRef ) && branchExists( automationRef ) ) {
        printAheadBehind( automationRef, mirrorRef, `${ automationRef } vs ${ mirrorRef }` );
    } else {
        console.log( `Skipping: ${ automationRef } vs ${ mirrorRef } (missing ref)` );
    }

    if ( branchExists( automationRef ) && branchExists( customRef ) ) {
        printAheadBehind( customRef, automationRef, `${ customRef } vs ${ automationRef }` );
    } else {
        console.log( `Skipping: ${ customRef } vs ${ automationRef } (missing ref)` );
    }

    const status = gitOut( [ 'status', '--short' ] );
    console.log( '' );
    console.log( `Working tree clean: ${ status === '' ? 'yes' : 'no' }` );
}

function cmdSyncUpstream() {
    ensureGitRepo();
    ensureCleanWorkingTree();

    const sourceRemote = getOption( 'source-remote', defaults.sourceRemote );
    const sourceBranch = getOption( 'source-branch', defaults.sourceBranch );
    const mirrorBranch = getOption( 'mirror-branch', defaults.mirrorBranch );

    ensureRemoteExists( sourceRemote );

    git( [ 'fetch', '--prune', sourceRemote ] );
    ensureLocalBranchFrom( mirrorBranch, `${ sourceRemote }/${ sourceBranch }` );
    git( [ 'checkout', mirrorBranch ] );
    git( [ 'merge', '--ff-only', `${ sourceRemote }/${ sourceBranch }` ] );

    if ( hasFlag( 'push' ) ) {
        ensureRemoteExists( 'origin' );
        git( [ 'push', 'origin', mirrorBranch ] );
    }

    console.log( `Sync complete: ${ mirrorBranch } is aligned with ${ sourceRemote }/${ sourceBranch }` );
}

function cmdPrepareSyncBranch() {
    ensureGitRepo();
    ensureCleanWorkingTree();

    const sourceRemote = getOption( 'source-remote', defaults.sourceRemote );
    const sourceBranch = getOption( 'source-branch', defaults.sourceBranch );
    const mirrorBranch = getOption( 'mirror-branch', defaults.mirrorBranch );
    const automationBranch = getOption( 'automation-branch', defaults.automationBranch );

    ensureRemoteExists( sourceRemote );
    git( [ 'fetch', '--prune', sourceRemote ] );
    ensureLocalBranchFrom( mirrorBranch, `${ sourceRemote }/${ sourceBranch }` );

    // Recreate/update the automation branch from the current mirror branch.
    git( [ 'checkout', '-B', automationBranch, mirrorBranch ] );

    if ( hasFlag( 'push' ) ) {
        ensureRemoteExists( 'origin' );
        git( [ 'push', '--force-with-lease', 'origin', automationBranch ] );
    }

    console.log( `Prepared ${ automationBranch } from ${ mirrorBranch }` );
}

function cmdMergeIntoSkyCms() {
    ensureGitRepo();
    ensureCleanWorkingTree();

    const automationBranch = getOption( 'automation-branch', defaults.automationBranch );
    const customBranch = getOption( 'custom-branch', defaults.customBranch );

    if ( !branchExists( automationBranch ) ) {
        fail( `Missing branch: ${ automationBranch }` );
    }

    ensureLocalBranch( customBranch );
    git( [ 'checkout', customBranch ] );
    git( [ 'merge', '--no-ff', automationBranch ] );

    if ( hasFlag( 'push' ) ) {
        ensureRemoteExists( 'origin' );
        git( [ 'push', 'origin', customBranch ] );
    }

    console.log( `Merge complete: ${ automationBranch } -> ${ customBranch }` );
}

function parseOptions( argv ) {
    const parsed = new Map();

    for ( let i = 0; i < argv.length; i += 1 ) {
        const token = argv[i];

        if ( !token.startsWith( '--' ) ) {
            fail( `Unexpected argument: ${ token }` );
        }

        const key = token.slice( 2 );
        const next = argv[i + 1];

        if ( next && !next.startsWith( '--' ) ) {
            parsed.set( key, next );
            i += 1;
        } else {
            parsed.set( key, true );
        }
    }

    return parsed;
}

function getOption( key, fallback ) {
    const value = options.get( key );
    if ( value === undefined || value === true ) {
        return fallback;
    }

    return value;
}

function hasFlag( key ) {
    return options.get( key ) === true;
}

function git( gitArgs ) {
    const result = spawnSync( 'git', gitArgs, {
        cwd: repoRoot,
        stdio: 'inherit'
    } );

    if ( result.status !== 0 ) {
        fail( `git ${ gitArgs.join( ' ' ) } failed` );
    }
}

function gitOut( gitArgs ) {
    const result = spawnSync( 'git', gitArgs, {
        cwd: repoRoot,
        encoding: 'utf8'
    } );

    if ( result.status !== 0 ) {
        fail( `git ${ gitArgs.join( ' ' ) } failed` );
    }

    return result.stdout.trim();
}

function ensureGitRepo() {
    const inside = gitOut( [ 'rev-parse', '--is-inside-work-tree' ] );
    if ( inside !== 'true' ) {
        fail( 'Not inside a git work tree.' );
    }
}

function ensureCleanWorkingTree() {
    const status = gitOut( [ 'status', '--porcelain' ] );
    if ( status !== '' ) {
        fail( 'Working tree is not clean. Commit/stash changes first.' );
    }
}

function ensureRemoteExists( remoteName ) {
    const remotes = gitOut( [ 'remote' ] ).split( /\r?\n/ ).filter( Boolean );
    if ( !remotes.includes( remoteName ) ) {
        fail( `Missing git remote: ${ remoteName }` );
    }
}

function branchExists( refName ) {
    const result = spawnSync( 'git', [ 'rev-parse', '--verify', '--quiet', refName ], {
        cwd: repoRoot
    } );

    return result.status === 0;
}

function ensureLocalBranch( branchName ) {
    if ( branchExists( branchName ) ) {
        return;
    }

    fail( `Missing local branch: ${ branchName }` );
}

function ensureLocalBranchFrom( branchName, startRef ) {
    if ( branchExists( branchName ) ) {
        return;
    }

    if ( !branchExists( startRef ) ) {
        fail( `Missing start reference: ${ startRef }` );
    }

    git( [ 'checkout', '-b', branchName, startRef ] );
}

function printAheadBehind( leftRef, rightRef, label ) {
    const out = gitOut( [ 'rev-list', '--left-right', '--count', `${ leftRef }...${ rightRef }` ] );
    const [ leftAhead = '0', rightAhead = '0' ] = out.split( /\s+/ );
    console.log( `${ label }: ${ leftRef } ahead=${ leftAhead }, ${ rightRef } ahead=${ rightAhead }` );
}

function fail( message ) {
    console.error( `Error: ${ message }` );
    process.exit( 1 );
}

function printHelp() {
    console.log( 'SkyCMS GrapesJS upstream sync workflow' );
    console.log( '' );
    console.log( 'Commands:' );
    console.log( '  status' );
    console.log( '  sync-upstream [--source-remote <name>] [--source-branch <name>] [--mirror-branch <name>] [--push]' );
    console.log( '  prepare-sync-branch [--source-remote <name>] [--source-branch <name>] [--mirror-branch <name>] [--automation-branch <name>] [--push]' );
    console.log( '  merge-into-skycms [--automation-branch <name>] [--custom-branch <name>] [--push]' );
    console.log( '  run-all [--source-remote <name>] [--source-branch <name>] [--mirror-branch <name>] [--automation-branch <name>] [--custom-branch <name>] [--push] [--merge]' );
    console.log( '' );
    console.log( 'Defaults:' );
    console.log( `  source-remote:    ${ defaults.sourceRemote }` );
    console.log( `  source-branch:    ${ defaults.sourceBranch }` );
    console.log( `  mirror-branch:    ${ defaults.mirrorBranch }` );
    console.log( `  automation-branch:${ defaults.automationBranch }` );
    console.log( `  custom-branch:    ${ defaults.customBranch }` );
}