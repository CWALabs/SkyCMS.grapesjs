# Color Normalization Hook - Implementation Guide

## Overview

The color normalization system in GrapesJS PropertyView implements a multi-layer approach to ensure HTML color input elements always receive valid hex color values (#RRGGBB format) instead of CSS named colors (black, white) or other formats.

## Architecture

### 1. Base Normalizer: `normalizeColorInputValue()`

**Purpose:** Convert any color format to 6-digit hex

**Supported Input Formats:**

- Named colors: `black` → `#000000`, `white` → `#ffffff`
- Short hex: `#fff` → `#ffffff`, `#f00` → `#ff0000`
- Long hex: `#ffffff` (passthrough)
- RGB: `rgb(255, 0, 0)` → `#ff0000`
- RGBA: `rgba(255, 0, 0, 0.5)` → `#ff0000` (alpha ignored)
- HTML color names: Probed via DOM color detection

**Location:** `PropertyView.ts:38-56`

```typescript
const normalizeColorInputValue = (value: string) => {
  const rawValue = value.trim();
  if (!rawValue) return '';

  const namedHexColor = NAMED_COLOR_TO_HEX[rawValue.toLowerCase()];
  if (namedHexColor) return namedHexColor;

  const hexColor = toSixDigitHexColor(rawValue);
  if (hexColor) return hexColor;

  const rgbHexColor = rgbStringToHexColor(rawValue);
  if (rgbHexColor) return rgbHexColor;

  // DOM color probe for HTML color names
  if (typeof document === 'undefined') return '';
  const colorProbe = document.createElement('option');
  colorProbe.style.color = rawValue;
  if (!colorProbe.style.color) return '';
  return getNormalizedComputedColor(colorProbe);
};
```

### 2. Options Normalizer: `normalizeColorOptions()`

**Purpose:** Normalize color values within property definition option arrays

**Handles:**

- String array items (bare color names)
- Object with `value` property
- Object with `id` property (internal color ID)
- Object with `color` property (direct color value)
- Nested options arrays (recursive)

**Location:** `PropertyView.ts:62-85`

```typescript
const normalizeColorOptions = (options: any) => {
  if (!Array.isArray(options)) return;

  options.forEach((option, index) => {
    if (typeof option === 'string') {
      const normalizedColor = normalizeColorInputValue(option);
      if (normalizedColor) options[index] = normalizedColor;
      return;
    }

    if (option && typeof option === 'object') {
      ['value', 'id', 'color'].forEach((key) => {
        const current = option[key];
        if (typeof current === 'string') {
          const normalizedColor = normalizeColorInputValue(current);
          if (normalizedColor) option[key] = normalizedColor;
        }
      });

      if (Array.isArray(option.options)) {
        normalizeColorOptions(option.options);
      }
    }
  });
};
```

### 3. Model Getter Interception: `withNormalizedColorPropertyReads()`

**Purpose:** Temporarily override property model getters to return normalized values during callback execution

**Wrapped Methods:**

- `get(key)` - Returns normalized value for `value`, `default`, `defaults` keys
- `getValue()` - Returns normalized string
- `getDefaultValue()` - Returns normalized string
- `getFullValue()` - Returns normalized string
- `__getFullValue()` - Returns normalized string (internal full value with style object)

**Timing:** Only active during callback execution, restored in finally block

**Location:** `PropertyView.ts:91-148`

```typescript
const withNormalizedColorPropertyReads = <T>(property: any, run: () => T) => {
  if (!property || typeof property !== 'object') return run();

  const originalGet = property.get;
  // ... store all original methods

  if (originalGet) {
    property.get = function (key: any, ...args: any[]) {
      const value = originalGet.call(this, key, ...args);
      if (key === 'options') {
        normalizeColorOptions(value);
        return value;
      }
      if (key === 'value' || key === 'default' || key === 'defaults') {
        return normalizeColorString(value);
      }
      return value;
    };
  }

  // ... similar wrappers for other getters

  try {
    return run();
  } finally {
    // Restore all original methods
    property.get = originalGet;
    // ...
  }
};
```

### 4. DOM Input Interception: `withColorInputAssignmentNormalization()`

**Purpose:** Intercept and normalize HTML input element color assignments at the DOM API level

**Intercepts:**

- `HTMLInputElement.prototype.value` setter - Catches `input.value = "black"`
- `Element.prototype.setAttribute()` - Catches `el.setAttribute('value', 'white')`

**Safety Features:**

- Safe cross-origin iframe handling
- Graceful fallback if prototypes unavailable
- Cleanup in finally block

**Location:** `PropertyView.ts:165-248`

```typescript
const withColorInputAssignmentNormalization = <T>(el: HTMLElement, run: () => T) => {
  // ... safely enumerate all windows and frames

  windows.forEach((currentWindow) => {
    const InputEl = currentWindow.HTMLInputElement;
    const ElementEl = currentWindow.Element;

    if (!InputEl?.prototype || !ElementEl?.prototype) return;

    const valueDescriptor = Object.getOwnPropertyDescriptor(InputEl.prototype, 'value');
    const valueSetter = valueDescriptor?.set;

    Object.defineProperty(InputEl.prototype, 'value', {
      set(nextValue: string) {
        if ((this as HTMLInputElement).type === 'color') {
          const value = typeof nextValue === 'string' ? nextValue : `${nextValue ?? ''}`;
          const normalizedColor = normalizeColorInputValue(value);
          if (!normalizedColor) return;
          valueSetter.call(this, normalizedColor);
          return;
        }
        valueSetter.call(this, nextValue);
      },
    });

    // Similar patch for setAttribute()
  });

  try {
    return run();
  } finally {
    // Restore all original prototypes
  }
};
```

### 5. Update Callback Wrapper: `__update()`

**Purpose:** Main entry point that orchestrates all normalization layers

**Execution Flow:**

1. Determine if property is a color type
2. Pre-normalize the explicit value field
3. Normalize model attributes (value, default)
4. Normalize options arrays
5. Wrap callback execution in both getter interception and DOM interception
6. Pass normalized value in callback payload

**Location:** `PropertyView.ts:501-525`

```typescript
__update(value: string) {
  const update = this.update && this.update.bind(this);
  const input = this.getInputEl();
  const isColorValue = input?.type === 'color' || this.model?.getType?.() === 'color';
  const normalizedValue = isColorValue ? this.__normalizeInputValue(value) : value;

  if (isColorValue) {
    // Step 1: Normalize model attributes
    const attrs = (this.model as any)?.attributes;
    if (attrs?.value) {
      attrs.value = normalizeColorInputValue(attrs.value) || attrs.value;
    }
    if (attrs?.default) {
      attrs.default = normalizeColorInputValue(attrs.default) || attrs.default;
    }

    // Step 2: Normalize options arrays
    normalizeColorOptions(attrs?.options);
    normalizeColorOptions((this.model as any)?.get?.('options'));
  }

  // Step 3-5: Orchestrate callback with both wrappers
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

## Color Mapping Reference

### Built-in Named Colors

```typescript
const NAMED_COLOR_TO_HEX: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
};
```

### Expansion Logic

- **Normalize short hex:** `#fff` → `#ffffff`
  - Pattern: `#ABC` → `#AABBCC`
- **RGB to hex:** `rgb(255, 0, 0)` or `rgba(255, 0, 0, 1)` → `#ff0000`
  - Takes first 3 RGB channels, ignores alpha
  - Clamps values to 0-255 range
  - Pads channel values with leading zero if needed

## Usage in PropertyView

### When Normalization is Applied

1. **Property Render** → calls `setValue()`
2. **setValue()** → calls `__normalizeInputValue()` then `__update()`
3. **\_\_update()** → applies full normalization stack
4. **Display** → input element receives normalized hex value

### Data Flow

```
model.getFullValue() [e.g., "black"]
  ↓
setValue(value)
  ↓
__normalizeInputValue(value) [→ "#000000"]
  ↓
__update(normalizedValue)
  ├─ normalizeColorOptions(model.attributes.options)
  ├─ normalizeColorOptions(model.get('options'))
  ├─ Normalize model.attributes.value, default
  │
  └─ withNormalizedColorPropertyReads(model, () =>
       withColorInputAssignmentNormalization(el, () =>
         update({ value: normalizedValue, ... })
       )
     )
```

## Testing

### Test Coverage

**File:** `packages/core/test/specs/style_manager/view/PropertyView.ts`

Tests verify:

- ✅ Normalized colors pass to update callback
- ✅ Direct color input assignment is normalized
- ✅ Model reads return normalized values during callback
- ✅ Options arrays are normalized
- ✅ Non-color properties are unaffected

### Run Tests

```bash
pnpm -C packages/core test test/specs/style_manager/view/PropertyView.ts
```

## Known Limitations

1. **DOM prototype patching scope:** Limited to accessible windows (may miss workers, nested iframes with cross-origin restrictions)
2. **Runtime-only:** Normalization happens at render/update time, not at model definition time
3. **Callback independence:** If custom callbacks read properties outside the wrapped execution, they may still see non-normalized values

## Future Improvements

1. **Model-level normalization:** Normalize color values when they're first set in the model
2. **Validation layer:** Add model property validation to reject non-hex colors at source
3. **Migration helper:** Tool to normalize all color properties in existing style definitions
4. **TypeScript types:** Add strict color value types to Property model

## Performance Considerations

- **Per-call overhead:** Wrapper functions have minimal overhead (few function calls, simple checks)
- **Prototype patching:** Only active during callback execution (try/finally scope)
- **Array iteration:** normalizeColorOptions iterates through options once per update
- **Recommended:** No performance impact for non-color properties (early return)

## Integration with GrapesJS

- Part of: `style_manager/view/PropertyView.ts`
- Depends on: `normalizeColorInputValue()` helper (already in codebase)
- Used by: Custom property update callbacks from plugins
- Affects: Color input rendering in style manager

## References

- HTML input type=color spec: https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)
- CSS named colors: https://www.w3.org/TR/css-color-3/#svg-color
- RGB to hex conversion: Standard base-16 conversion of 0-255 channel values
