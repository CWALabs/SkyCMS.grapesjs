import PropertyView from '../../../../src/style_manager/view/PropertyView';
import Property from '../../../../src/style_manager/model/Property';
import Editor from '../../../../src/editor/model/Editor';
import Component from '../../../../src/dom_components/model/Component';

describe('PropertyView', () => {
  let em: Editor;
  let dcomp: Editor['Components'];
  let compOpts: any;
  var component: Component;
  var fixtures: HTMLElement;
  var target: Component;
  var model: Property;
  var view: PropertyView;
  var propName = 'testprop';
  var propValue = 'testvalue';
  var defValue = 'testDefault';

  beforeEach(() => {
    em = new Editor({});
    dcomp = em.Components;
    compOpts = { em, componentTypes: dcomp.componentTypes };
    target = new Component({}, compOpts);
    component = new Component({}, compOpts);
    model = new Property({ property: propName }, { em });
    view = new PropertyView({
      model,
      config: { em },
    });
    document.body.innerHTML = '<div id="fixtures"></div>';
    fixtures = document.body.firstChild as HTMLElement;
    view.render();
    fixtures.appendChild(view.el);
  });

  afterEach(() => {
    em.destroy();
  });

  test('Rendered correctly', () => {
    var prop = view.el;
    expect(fixtures.querySelector('.property')).toBeTruthy();
    expect(prop.querySelector('.label')).toBeTruthy();
    expect(prop.querySelector('.field')).toBeTruthy();
  });

  test('Input should exist', () => {
    expect(view.getInputEl()).toBeTruthy();
  });

  test('Input value is empty', () => {
    expect(view.model.get('value')).toBeFalsy();
    expect(view.getInputEl().value).toBeFalsy();
  });

  test('Model not change without update trigger', () => {
    view.getInputEl().value = propValue;
    expect(view.model.get('value')).toBeFalsy();
  });

  test('Update model on input change', () => {
    view.getInputEl().value = propValue;
    view.inputValueChanged({
      target: { value: propValue },
      stopPropagation() {},
    });
    expect(view.model.get('value')).toEqual(propValue);
  });

  test('Update input on value change', (done) => {
    view.model.set('value', propValue);
    setTimeout(() => {
      expect(view.getInputEl().value).toEqual(propValue);
      done();
    }, 15);
  });

  describe('Init property', () => {
    beforeEach(() => {
      em = new Editor({});
      component = new Component({}, { em, config: em.Components.config });
      model = new Property({
        property: propName,
        default: defValue,
      });
      view = new PropertyView({
        model,
      });
      fixtures.innerHTML = '';
      view.render();
      fixtures.appendChild(view.el);
    });

    test('Value as default', () => {
      expect(view.model.getValue()).toEqual(defValue);
    });

    test('Placeholder as default', () => {
      var input = view.getInputEl();
      expect(input.getAttribute('placeholder')).toEqual(defValue);
    });

    test('Input value is set up to default', () => {
      expect(view.getInputEl().value).toEqual(defValue);
    });
  });

  describe('Color input normalization', () => {
    class ColorPropertyView extends PropertyView {
      templateInput() {
        return `
          <div class="field">
            <input type="color"/>
          </div>
        `;
      }
    }

    beforeEach(() => {
      view = new ColorPropertyView({
        model,
        config: { em },
      });
      fixtures.innerHTML = '';
      view.render();
      fixtures.appendChild(view.el);
    });

    test('Named colors are converted to hex', () => {
      view.setValue('black');
      expect(view.getInputEl().value).toEqual('#000000');
    });

    test('RGB colors are converted to hex', () => {
      view.setValue('rgb(255, 255, 255)');
      expect(view.getInputEl().value).toEqual('#ffffff');
    });

    test('Custom update receives normalized color value', () => {
      let updateValue = '';

      class CustomUpdateColorPropertyView extends PropertyView {
        templateInput() {
          return `
            <div class="field">
              <input type="color"/>
            </div>
          `;
        }

        update = ({ value }: any) => {
          updateValue = value;
        };
      }

      const customView = new CustomUpdateColorPropertyView({
        model: new Property({ property: 'color-test' }, { em }),
        config: { em },
      });

      customView.render();
      fixtures.appendChild(customView.el);
      customView.setValue('black');

      expect(updateValue).toEqual('#000000');
      customView.remove();
    });

    test('Custom update normalizes direct color input assignment', () => {
      class CustomUpdateColorPropertyView extends PropertyView {
        templateInput() {
          return `
            <div class="field">
              <input type="color"/>
            </div>
          `;
        }

        update = ({ el }: any) => {
          const input = el.querySelector('input');
          input.value = 'white';
        };
      }

      const customView = new CustomUpdateColorPropertyView({
        model: new Property({ property: 'color-test' }, { em }),
        config: { em },
      });

      customView.render();
      fixtures.appendChild(customView.el);
      customView.setValue('white');

      expect(customView.getInputEl().value).toEqual('#ffffff');
      customView.remove();
    });
  });
});
