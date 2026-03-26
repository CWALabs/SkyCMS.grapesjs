import { createSkyPageEditorDriverStub } from './skyPageEditorDriverStub.js';

const skyPageEditorMedia = [
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">',
    '<path fill="currentColor" d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm2 4h12V6H6v1Zm0 4h8v-1H6v1Zm0 4h8v-1H6v1Zm10.85-1.15-1.7 1.7 2.6 2.6 1.7-1.7a.5.5 0 0 0 0-.71l-1.89-1.89a.5.5 0 0 0-.71 0ZM14.6 15.8 14 18l2.2-.6-1.6-1.6Z"/>',
    '</svg>'
].join( '' );
const ckeditorBlockType = 'CKEditor';

export const ckeditorBlockPlugin = ( editor ) => {
    const driver = createSkyPageEditorDriverStub( editor );

    editor.DomComponents.addType( ckeditorBlockType, {
        extend: 'text',
        isComponent: el => el.classList?.contains( 'ck-content' ),
        model: {
            defaults: {
                name: 'Sky Page Editor',
                editable: true,
                textable: true,
                attributes: {
                    class: 'ck-content',
                    'data-editor-config': 'ckeditor',
                    'data-ccms-new': 'true'
                },
                style: {
                    'min-height': '60px',
                    width: '100%'
                },
                content: 'Your content here.',
                droppable: false
            }
        }
    } );

    editor.on( 'component:remove', component => {
        if ( driver.isApplicable( component ) ) {
            driver.destroy( component );
        }
    } );

    editor.on( 'component:selected', ( component, options ) => {
        if ( driver.isApplicable( component ) ) {
            driver.enable( component, options?.event );
        }
    } );

    editor.on( 'component:deselected', component => {
        if ( driver.isApplicable( component ) ) {
            driver.blur( component );
        }
    } );

    editor.Blocks.add( ckeditorBlockType, {
        label: 'Sky Page Editor',
        category: 'Sky CMS',
        media: skyPageEditorMedia,
        content: {
            type: ckeditorBlockType
        }
    } );
};
