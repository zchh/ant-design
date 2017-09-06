#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const postcss = require('postcss');
const less = require('less');

const PLACEHOLDERS = {
  '@primary-color': '#999999',
  '@link-color': '#999999',
  '@outline-color': '#999999',
  '@btn-primary-bg': '#999999',
  '@input-hover-border-color': '#999999',
  '@process-default-color': '#999999',
  '@primary-1': '#999998',
  '@primary-2': '#999997',
  '@primary-5': '#999996',
  '@primary-6': '#999995',
  '@primary-7': '#999994',
};

const COMPUTED = {
  '@primary-5': '#b1b1b1',
  '@primary-7': '#858585',
  '@slider-0': '#d6d6d6',
  '@slider-1': '#cccccc',
  '@slider-2': 'rgba(153, 153, 153, 0.2)',
  '@slider-3': '#c2c2c2',
  '@start-button-color': '#40a5ed',
};

const reducePlugin = postcss.plugin('reducePlugin', () => {
  const cleanRule = (rule) => {
    let removeRule = true;
    rule.walkDecls((decl) => {
      if (
        !decl.prop.includes('color') &&
        !decl.prop.includes('background') &&
        !decl.prop.includes('border') &&
        !decl.prop.includes('box-shadow')
      ) {
        decl.remove();
      } else {
        removeRule = false;
      }
    });
    if (removeRule) {
      rule.remove();
    }
  };
  return (css) => {
    css.walkAtRules((atRule) => {
      atRule.remove();
    });

    css.walkRules(cleanRule);

    css.walkComments(c => c.remove());
  };
});

async function generateCss() {
  const antd = path.resolve(__dirname, '../');
  const entry = path.join(antd, 'components/style/index.less');
  let content = fs.readFileSync(entry).toString();
  const styles = glob.sync(path.join(antd, 'components/*/style/index.less'));
  content += '\n';
  Object.keys(PLACEHOLDERS).forEach((key) => {
    content += `${key}: ${PLACEHOLDERS[key]};\n`;
  });
  content += '\n';
  styles.forEach((style) => {
    content += `@import "${style}";\n`;
  });
  content += `@import "${path.join(antd, 'site/theme/static/index.less')}";\n`;
  fs.writeFileSync('/tmp/style.less', content);

  let result = (await less.render.call(less, content, {
    paths: [path.join(antd, 'components/style')],
  })).css;

  result = (await postcss([
    reducePlugin,
  ]).process(result, { parser: less.parser, from: entry })).css;

  Object.keys(PLACEHOLDERS).forEach((key) => {
    result = result.replace(new RegExp(PLACEHOLDERS[key], 'g'), key);
  });
  Object.keys(COMPUTED).forEach((key) => {
    result = result.replace(new RegExp(COMPUTED[key], 'g'), key);
  });

  fs.writeFileSync(path.resolve(__dirname, '../_site/theme.less'), result);
}

generateCss();
