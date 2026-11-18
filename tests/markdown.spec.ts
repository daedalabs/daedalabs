import { test, expect } from '@playwright/test';
import { renderReadme } from '../src/lib/markdown';

test.describe('Markdown README Renderer', () => {
  const options = { org: 'daedalabs', repo: 'test-repo' };

  test('a GFM table produces <table>', () => {
    const markdown = '| Col 1 | Col 2 |\n|---|---|\n| Val 1 | Val 2 |';
    const html = renderReadme(markdown, options);
    expect(html).toContain('<table>');
    expect(html).toContain('<thead>');
    expect(html).toContain('<th>Col 1</th>');
    expect(html).toContain('<tbody>');
    expect(html).toContain('<td>Val 1</td>');
  });

  test('- [x] done produces a checkbox input', () => {
    const markdown = '- [x] done\n- [ ] pending';
    const html = renderReadme(markdown, options);
    expect(html).toContain('<input type="checkbox" checked disabled>');
    expect(html).toContain('<input type="checkbox" disabled>');
    expect(html).toContain('done');
    expect(html).toContain('pending');
  });

  test('~~old~~ produces <del>', () => {
    const markdown = '~~old~~';
    const html = renderReadme(markdown, options);
    expect(html).toContain('<del>old</del>');
  });

  test('<details><summary>x</summary>y</details> survives as HTML', () => {
    const markdown = '<details><summary>x</summary>y</details>';
    const html = renderReadme(markdown, options);
    expect(html).toContain('<details><summary>x</summary>y</details>');
  });

  test('<script>alert(1)</script>, <img src=x onerror=alert(1)>, and [x](javascript:alert(1)) are removed or neutralized', () => {
    const markdown = [
      '<script>alert(1)</script>',
      '<img src="x" onerror="alert(1)">',
      '<a href="javascript:alert(1)">x</a>',
      '[x](<javascript:alert(1)>)',
      '[x](javascript:alert%281%29)',
      '[x](javascript:alert)',
    ].join('\n\n');

    const html = renderReadme(markdown, options);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('alert(1)');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
  });

  test('![shot](./assets/demo.png) and [guide](docs/setup.md) point at the expected GitHub URLs', () => {
    const markdown = '![shot](./assets/demo.png)\n\n[guide](docs/setup.md)';
    const html = renderReadme(markdown, options);
    expect(html).toContain(
      '<img src="https://raw.githubusercontent.com/daedalabs/test-repo/HEAD/assets/demo.png" alt="shot">'
    );
    expect(html).toContain(
      '<a href="https://github.com/daedalabs/test-repo/blob/HEAD/docs/setup.md" target="_blank" rel="noopener noreferrer nofollow">guide</a>'
    );
  });

  test('![shot](/assets/demo.png) and ../img/x.png resolve correctly', () => {
    const markdown = '![shot](/assets/demo.png)\n\n![parent](../img/x.png)';
    const html = renderReadme(markdown, options);
    expect(html).toContain(
      '<img src="https://raw.githubusercontent.com/daedalabs/test-repo/HEAD/assets/demo.png" alt="shot">'
    );
    expect(html).toContain(
      '<img src="https://raw.githubusercontent.com/daedalabs/test-repo/HEAD/img/x.png" alt="parent">'
    );
  });

  test('the leading <h1> is stripped but later headings remain', () => {
    const markdown =
      '# Project Title\n\nIntro paragraph\n\n## Subheading\n\n# Another H1';
    const html = renderReadme(markdown, options);
    expect(html).not.toContain('<h1>Project Title</h1>');
    expect(html).toContain('<p>Intro paragraph</p>');
    expect(html).toContain('<h2>Subheading</h2>');
    expect(html).toContain('<h1>Another H1</h1>');
  });

  test('raw HTML image tags like pteron logo are preserved and rewritten', () => {
    const markdown = `# pteron

<p align="center">
  <img src="public/pteron.svg" width="96" height="96" alt="pteron logo"/>
</p>

<p align="center">
  <strong>Desktop vector animation and motion graphics editor</strong>
</p>

pteron is a Windows desktop application`;
    const html = renderReadme(markdown, { org: 'daedalabs', repo: 'pteron' });
    expect(html).not.toContain('&lt;p align=');
    expect(html).not.toContain('<h1>pteron</h1>');
    expect(html).toContain('<p align="center">');
    expect(html).toContain(
      'src="https://raw.githubusercontent.com/daedalabs/pteron/HEAD/public/pteron.svg"'
    );
    expect(html).toContain('width="96"');
    expect(html).toContain('height="96"');
    expect(html).toContain(
      '<strong>Desktop vector animation and motion graphics editor</strong>'
    );
    expect(html).toContain('<p>pteron is a Windows desktop application</p>');
  });
});
