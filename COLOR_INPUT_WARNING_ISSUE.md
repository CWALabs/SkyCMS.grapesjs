# GrapesJS Color Input Warning Issue

## Problem

When the Style Manager renders color properties with named color values (e.g., "black", "white"), the browser console displays validation errors from the HTML `<input type="color">` element:

```
The specified value "black" does not conform to the required format.
The format is "#rrggbb" where rr, gg, bb are two-digit hexadecimal numbers.
```

**Error Stack Trace Location:**
- File: `packages/core/src/style_manager/view/PropertyView.ts`
- Line: ~503 (in `__update()` method within callback execution)
- Triggered during: Style Manager initialization when rendering color property definitions

## Root Cause Analysis

The issue occurs at the **update callback invocation level**:

1. PropertyView defines color properties with named color defaults (black, white)
2. During `render()`, `setValue()` is called with the model's default value
3. `setValue()` calls `__update()` which invokes the custom update callback
4. The custom update callback accesses the model's attributes and attempts to set `input.value` or read properties
5. The input element receives "black"/"white" and rejects it as invalid for type="color"

## Attempted Fix

### Approach: Multi-Layer Color Normalization

Three normalization points were implemented in `PropertyView.ts`:

#### 1. **normalizeColorOptions()** (lines 62-85)
- Normalizes color values in property option arrays
- Handles multiple object shapes: string items, `value` property, `id` property, `color` property
- Recursively normalizes nested options arrays

#### 2. **withNormalizedColorPropertyReads()** (lines 91-148)
- Temporary wrapper that intercepts property model getters during callback execution
- Wraps: `get()`, `getValue()`, `getDefaultValue()`, `getFullValue()`, `__getFullValue()`
- Returns normalized hex values for color-related attribute reads
- Restores original methods in finally block

#### 3. **withColorInputAssignmentNormalization()** (lines 165-248)
- Patches `HTMLInputElement.prototype.value` setter for color inputs
- Patches `Element.prototype.setAttribute()` for color value attributes
- Normalizes assignments before they reach the DOM
- Handles cross-origin and iframe windows safely

#### 4. **__update() Method** (lines 501-525)
- Pre-normalizes explicit value field before callback
- Normalizes model attributes directly (attributes.value, attributes.default)
- Wraps callback in both normalization helpers
- Normalizes options arrays

### Code Changed

**File:** `packages/core/src/style_manager/view/PropertyView.ts`

```typescript
__update(value: string) {
  const update = this.update && this.update.bind(this);
  const input = this.getInputEl();
  const isColorValue = input?.type === 'color' || this.model?.getType?.() === 'color';
  const normalizedValue = isColorValue ? this.__normalizeInputValue(value) : value;

  if (isColorValue) {
    const attrs = (this.model as any)?.attributes;
    const modelValue = attrs?.value;
    const modelDefault = attrs?.default;
    
    // Normalize model attributes so direct access reads normalized values
    if (attrs && modelValue) {
      const normalizedModel = normalizeColorInputValue(modelValue);
      if (normalizedModel) attrs.value = normalizedModel;
    }
    if (attrs && modelDefault) {
      const normalizedDefault = normalizeColorInputValue(modelDefault);
      if (normalizedDefault) attrs.default = normalizedDefault;
    }
    
    normalizeColorOptions(attrs?.options);
    normalizeColorOptions((this.model as any)?.get?.('options'));
  }

  update &&
    withNormalizedColorPropertyReads(this.model, () =>
      withColorInputAssignmentNormalization(this.el, () => {
        update({
          ...this._getClbOpts(),
          value: normalizedValue,
        });
      })
    );
}
```

## Why It Didn't Fully Resolve

Despite normalizing:
- ✅ The explicit `value` field passed to callback
- ✅ Model attributes (`attrs.value`, `attrs.default`)
- ✅ Model getter method overrides
- ✅ Input element `value` setter and `setAttribute()` calls
- ✅ Options arrays

The error still occurs at line 503. This suggests:

1. **The callback is still receiving non-normalized values from somewhere**, possibly:
   - Plugin code directly accessing model internals before our wrappers are active
   - Backbone model sync/trigger events that fire independently
   - Another code path that bypasses our wrapper timing

2. **The error originates from within the update callback itself**, which means:
   - The callback is executing and attempting color operations
   - Our interception happens after the callback execution starts
   - The callback may be triggering additional render cycles

## Next Steps for Future Investigation

1. **Add callback logging:**
   - Instrument the update callback to log what values it receives
   - Check if normalized values are actually reaching the callback

2. **Trace the plugin code:**
   - Search for custom plugin update implementations
   - Check if they're reading model values independently of our wrappers

3. **Alternative approaches:**
   - Move normalization earlier (before callback is bound)
   - Replace the update callback reference with a normalized wrapper
   - Normalize default values at model definition time, not at render time

4. **Consider data model change:**
   - Store default color values already normalized in the model definition
   - This prevents the need for runtime normalization of defaults

## Test Status

- ✅ PropertyView unit tests: 13/13 pass
- ✅ Core package builds successfully
- ✅ Integration builds successfully
- ❌ Runtime: Console warning persists

## Files Modified

- `d:\source\SkyCMS.grapesjs\grapesjs\packages\core\src\style_manager\view\PropertyView.ts`

## Build Commands

```bash
# Rebuild core
pnpm -C packages/core build

# Rebuild integration
pnpm -C integrations/skycms build

# Start dev server
cd integrations/skycms
pnpm dev --host
```

## Related Files

- Style property model: `packages/core/src/style_manager/model/Property.ts`
- Style manager: `packages/core/src/style_manager/index.ts`
- Property stack: `packages/core/src/style_manager/view/PropertyStackView.ts`
