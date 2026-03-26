import { bindAll, isUndefined, debounce } from 'underscore';
import { View } from '../../common';
import EditorModel from '../../editor/model/Editor';
import { isObject } from '../../utils/mixins';
import Property from '../model/Property';
import { StyleProps } from '../../domain_abstract/model/StyleableModel';

const clearProp = 'data-clear-style';
const HEX_COLOR_REG = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB_COLOR_REG = /^rgba?\(([^)]+)\)$/i;
const NAMED_COLOR_TO_HEX: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
};

const toSixDigitHexColor = (value: string) => {
  if (!HEX_COLOR_REG.test(value)) return '';
  const normalized = value.toLowerCase();
  if (normalized.length === 7) return normalized;
  const shortHex = normalized.slice(1);
  return `#${shortHex[0]}${shortHex[0]}${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}`;
};

const rgbStringToHexColor = (value: string) => {
  const match = value.match(RGB_COLOR_REG);
  if (!match) return '';
  const channels = match[1]
    .split(',')
    .slice(0, 3)
    .map((part) => parseInt(part.trim(), 10));
  if (channels.length !== 3 || channels.some((channel) => Number.isNaN(channel))) return '';

  return `#${channels
    .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0'))
    .join('')}`;
};

const normalizeColorInputValue = (value: string) => {
  const rawValue = value.trim();
  if (!rawValue) return '';

  const namedHexColor = NAMED_COLOR_TO_HEX[rawValue.toLowerCase()];
  if (namedHexColor) return namedHexColor;

  const hexColor = toSixDigitHexColor(rawValue);
  if (hexColor) return hexColor;

  const rgbHexColor = rgbStringToHexColor(rawValue);
  if (rgbHexColor) return rgbHexColor;

  if (typeof document === 'undefined') return '';
  const colorProbe = document.createElement('option');
  colorProbe.style.color = rawValue;
  if (!colorProbe.style.color) return '';

  const parsedHexColor = toSixDigitHexColor(colorProbe.style.color);
  if (parsedHexColor) return parsedHexColor;

  return rgbStringToHexColor(colorProbe.style.color);
};

const normalizeColorOptions = (options: any) => {
  if (!Array.isArray(options)) return;

  options.forEach((option, index) => {
    if (typeof option === 'string') {
      const normalizedColor = normalizeColorInputValue(option);
      if (normalizedColor) {
        options[index] = normalizedColor;
      }
      return;
    }

    if (!option || typeof option !== 'object') return;

    ['value', 'id', 'color'].forEach((key) => {
      const current = option[key];
      if (typeof current !== 'string') return;
      const normalizedColor = normalizeColorInputValue(current);
      if (normalizedColor) {
        option[key] = normalizedColor;
      }
    });

    if (Array.isArray(option.options)) {
      normalizeColorOptions(option.options);
    }
  });
};

const withNormalizedColorPropertyReads = <T>(property: any, run: () => T) => {
  if (!property || typeof property !== 'object') return run();

  const originalGet = typeof property.get === 'function' ? property.get : undefined;
  const originalGetValue = typeof property.getValue === 'function' ? property.getValue : undefined;
  const originalGetDefaultValue =
    typeof property.getDefaultValue === 'function' ? property.getDefaultValue : undefined;
  const originalGetFullValue = typeof property.getFullValue === 'function' ? property.getFullValue : undefined;
  const originalGetInternalFullValue =
    typeof property.__getFullValue === 'function' ? property.__getFullValue : undefined;

  const normalizeColorString = (candidate: any) => {
    if (typeof candidate !== 'string') return candidate;
    return normalizeColorInputValue(candidate) || candidate;
  };

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

  if (originalGetValue) {
    property.getValue = function (...args: any[]) {
      return normalizeColorString(originalGetValue.call(this, ...args));
    };
  }

  if (originalGetDefaultValue) {
    property.getDefaultValue = function (...args: any[]) {
      return normalizeColorString(originalGetDefaultValue.call(this, ...args));
    };
  }

  if (originalGetFullValue) {
    property.getFullValue = function (...args: any[]) {
      return normalizeColorString(originalGetFullValue.call(this, ...args));
    };
  }

  if (originalGetInternalFullValue) {
    property.__getFullValue = function (...args: any[]) {
      return normalizeColorString(originalGetInternalFullValue.call(this, ...args));
    };
  }

  try {
    return run();
  } finally {
    if (originalGet) property.get = originalGet;
    if (originalGetValue) property.getValue = originalGetValue;
    if (originalGetDefaultValue) property.getDefaultValue = originalGetDefaultValue;
    if (originalGetFullValue) property.getFullValue = originalGetFullValue;
    if (originalGetInternalFullValue) property.__getFullValue = originalGetInternalFullValue;
  }
};

const withColorInputAssignmentNormalization = <T>(el: HTMLElement, run: () => T) => {
  const windows = new Set<Window>();

  const addWindowAndChildren = (candidate?: Window | null) => {
    if (!candidate || windows.has(candidate)) return;
    windows.add(candidate);

    try {
      const { frames } = candidate;
      for (let i = 0; i < frames.length; i += 1) {
        addWindowAndChildren(frames[i]);
      }
    } catch (error) {
      // Ignore cross-origin frame traversal errors.
    }
  };

  if (typeof window !== 'undefined') {
    addWindowAndChildren(window);

    try {
      addWindowAndChildren(window.top);
    } catch (error) {
      // Ignore cross-origin top window access.
    }

    try {
      addWindowAndChildren(window.parent);
    } catch (error) {
      // Ignore cross-origin parent window access.
    }
  }

  addWindowAndChildren(el?.ownerDocument?.defaultView);

  const restoreFns: Array<() => void> = [];

  windows.forEach((currentWindow) => {
    const InputEl = (currentWindow as any).HTMLInputElement as typeof HTMLInputElement;
    const ElementEl = (currentWindow as any).Element as typeof Element;
    if (!InputEl?.prototype || !ElementEl?.prototype) return;

    const valueDescriptor = Object.getOwnPropertyDescriptor(InputEl.prototype, 'value');
    const valueSetter = valueDescriptor?.set;
    const valueGetter = valueDescriptor?.get;
    const setAttribute = ElementEl.prototype.setAttribute;

    if (!valueDescriptor || !valueSetter || !setAttribute) return;

    Object.defineProperty(InputEl.prototype, 'value', {
      configurable: true,
      enumerable: valueDescriptor.enumerable,
      get() {
        return valueGetter ? valueGetter.call(this) : '';
      },
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

    ElementEl.prototype.setAttribute = function (name: string, value: string) {
      if (
        this instanceof InputEl &&
        this.type === 'color' &&
        String(name).toLowerCase() === 'value'
      ) {
        const normalizedColor = normalizeColorInputValue(typeof value === 'string' ? value : `${value ?? ''}`);
        if (!normalizedColor) return;
        setAttribute.call(this, name, normalizedColor);
        return;
      }

      setAttribute.call(this, name, value);
    };

    restoreFns.push(() => {
      Object.defineProperty(InputEl.prototype, 'value', valueDescriptor);
      ElementEl.prototype.setAttribute = setAttribute;
    });
  });

  try {
    return run();
  } finally {
    restoreFns.forEach((restore) => restore());
  }
};

export interface ICustomPropertyView {
  create?: (data: ReturnType<PropertyView['_getClbOpts']>) => any;
  destroy?: (data: ReturnType<PropertyView['_getClbOpts']>) => any;
  update?: (data: ReturnType<PropertyView['_getClbOpts']> & { value: string }) => any;
  emit?: (data: ReturnType<PropertyView['_getClbOpts']>, ...args: any) => any;
  unset?: (data: ReturnType<PropertyView['_getClbOpts']>) => any;
}

export type CustomPropertyView<T> = ICustomPropertyView & T & ThisType<T & PropertyView>;

export default class PropertyView extends View<Property> {
  em: EditorModel;
  pfx: string;
  ppfx: string;
  config: any;
  parent?: PropertyView;
  __destroyFn!: Function;
  create?: Function;
  destroy?: Function;
  update?: Function;
  emit?: Function;
  unset?: Function;
  clearEl?: HTMLElement;
  createdEl?: HTMLElement;
  input?: HTMLInputElement;
  $input?: any;

  constructor(o = {}) {
    super(o);
    bindAll(this, '__change', '__updateStyle');
    // @ts-ignore
    const config = o.config || {};
    const { em } = config;
    this.config = config;
    this.em = em;
    this.pfx = config.stylePrefix || '';
    this.ppfx = config.pStylePrefix || '';
    this.__destroyFn = this.destroy ? this.destroy.bind(this) : () => {};
    const { model } = this;
    // @ts-ignore
    model.view = this;

    // Put a sligh delay on debounce in order to execute the update
    // post styleManager.__upProps trigger.
    this.onValueChange = debounce(this.onValueChange.bind(this), 10);
    this.updateStatus = debounce(this.updateStatus.bind(this), 0);

    this.listenTo(model, 'destroy remove', this.remove);
    this.listenTo(model, 'change:visible', this.updateVisibility);
    this.listenTo(model, 'change:name change:className change:full', this.render);
    this.listenTo(model, 'change:value', this.onValueChange);
    this.listenTo(model, 'change:parentTarget', this.updateStatus);
    this.listenTo(em, 'change:device', this.onValueChange);

    // @ts-ignore
    const init = this.init && this.init.bind(this);
    init && init();
  }

  events() {
    return {
      change: 'inputValueChanged',
      [`click [${clearProp}]`]: 'clear',
    };
  }

  template(model: any) {
    const { pfx, ppfx } = this;
    return `
      <div class="${pfx}label" data-sm-label></div>
      <div class="${ppfx}fields" data-sm-fields></div>
    `;
  }

  templateLabel(model: Property) {
    const { pfx, em } = this;
    const { parent } = model;
    const { icon = '', info = '' } = model.attributes;
    const icons = em?.getConfig().icons;
    const iconClose = icons?.close || '';

    return `
      <span class="${pfx}icon ${icon}" title="${info}">
        ${model.getLabel()}
      </span>
      ${!parent ? `<div class="${pfx}clear" style="display: none" ${clearProp}>${iconClose}</div>` : ''}
    `;
  }

  templateInput(model: Property) {
    return `
      <div class="${this.ppfx}field">
        <input placeholder="${model.getDefaultValue()}"/>
      </div>
    `;
  }

  remove() {
    View.prototype.remove.apply(this, arguments as any);
    // @ts-ignore
    ['em', 'input', '$input', 'view'].forEach((i) => (this[i] = null));
    this.__destroyFn(this._getClbOpts());
    return this;
  }

  /**
   * Triggers when the status changes. The status indicates if the value of
   * the proprerty is changed or inherited
   * @private
   */
  updateStatus() {
    const { model, pfx, ppfx, config } = this;
    const updatedCls = `${ppfx}four-color`;
    const computedCls = `${ppfx}color-warn`;
    const labelEl = this.$el.children(`.${pfx}label`);
    const clearStyleEl = this.getClearEl();
    const clearStyle = clearStyleEl ? clearStyleEl.style : ({} as CSSStyleDeclaration);
    labelEl.removeClass(`${updatedCls} ${computedCls}`);
    clearStyle.display = 'none';

    if (model.hasValue({ noParent: true }) && config.highlightChanged) {
      labelEl.addClass(updatedCls);
      config.clearProperties && (clearStyle.display = '');
    } else if (model.hasValue() && config.highlightComputed) {
      labelEl.addClass(computedCls);
    }

    this.parent?.updateStatus();
  }

  /**
   * Clear the property from the target
   */
  clear(ev: Event) {
    ev && ev.stopPropagation();
    this.model.clear();
  }

  /**
   * Get clear element
   * @return {HTMLElement}
   */
  getClearEl() {
    if (!this.clearEl) {
      this.clearEl = this.el.querySelector(`[${clearProp}]`)!;
    }

    return this.clearEl;
  }

  /**
   * Triggers when the value of element input/s is changed, so have to update
   * the value of the model which will propogate those changes to the target
   */
  inputValueChanged(ev: any) {
    ev && ev.stopPropagation();
    // Skip the default update in case a custom emit method is defined
    if (this.emit) return;
    this.model.upValue(ev.target.value);
  }

  onValueChange(m: any, val: any, opt: any = {}) {
    this.setValue(this.model.getFullValue(undefined, { skipImportant: true }));
    this.updateStatus();
  }

  /**
   * Update the element input.
   * Usually the value is a result of `model.getFullValue()`
   * @param {String} value The value from the model
   * */
  setValue(value: string) {
    const { model } = this;
    const result = isUndefined(value) || value === '' ? model.getDefaultValue() : value;
    if (this.update) return this.__update(this.__normalizeInputValue(result));
    this.__setValueInput(result);
  }

  __normalizeInputValue(value: string) {
    const normalizedColor = normalizeColorInputValue(value);
    return normalizedColor || value;
  }

  __setValueInput(value: string) {
    const input = this.getInputEl();
    if (!input) return;
    const isColorValue = input.type === 'color' || this.model?.getType?.() === 'color';

    if (isColorValue) {
      const normalizedColor = normalizeColorInputValue(value);
      if (!normalizedColor) return;
      input.value = normalizedColor;
      return;
    }

    input.value = value;
  }

  getInputEl() {
    if (!this.input) {
      this.input = this.el.querySelector('input')!;
    }

    return this.input;
  }

  updateVisibility() {
    this.el.style.display = this.model.isVisible() ? '' : 'none';
  }

  clearCached() {
    delete this.clearEl;
    delete this.input;
    delete this.$input;
  }

  __unset() {
    const unset = this.unset && this.unset.bind(this);
    unset && unset(this._getClbOpts());
  }

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

  __change(...args: any) {
    const emit = this.emit && this.emit.bind(this);
    emit && emit(this._getClbOpts(), ...args);
  }

  __updateStyle(value: string | StyleProps, { complete, partial, ...opts }: any = {}) {
    const { model } = this;
    const final = complete !== false && partial !== true;

    if (isObject(value)) {
      model.__upTargetsStyle(value as StyleProps, { avoidStore: !final });
    } else {
      model.upValue(value, { partial: !final });
    }
  }

  _getClbOpts() {
    const { model, el, createdEl } = this;
    return {
      el,
      createdEl,
      property: model,
      props: model.attributes,
      change: this.__change,
      updateStyle: this.__updateStyle,
    };
  }

  render() {
    this.clearCached();
    const { pfx, model, el, $el } = this;
    const name = model.getName();
    const type = model.getType();
    const cls = model.get('className') || '';
    const className = `${pfx}property`;
    // Support old integer classname
    const clsType = type === 'number' ? `${pfx}${type} ${pfx}integer` : `${pfx}${type}`;

    this.createdEl && this.__destroyFn(this._getClbOpts());
    $el.empty().append(this.template(model));
    $el.find('[data-sm-label]').append(this.templateLabel(model));
    const create = this.create && this.create.bind(this);
    this.createdEl = create && create(this._getClbOpts());
    $el.find('[data-sm-fields]').append(this.createdEl || this.templateInput(model));

    el.className = `${className} ${clsType} ${className}__${name} ${cls}`.trim();
    el.className += model.isFull() ? ` ${className}--full` : '';

    const onRender = this.onRender && this.onRender.bind(this);
    onRender && onRender();
    this.setValue(model.getValue());
    return this;
  }

  onRender() {}
}
