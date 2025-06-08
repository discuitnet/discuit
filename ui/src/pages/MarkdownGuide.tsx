import StaticPage from '../components/StaticPage';

const MarkdownGuide = () => {
  return (
    <StaticPage className="page-markdown-guide" title="Markdown Guide">
      <div className="document">
        <h1>Markdown guide</h1>
        <p>
          {'We use '}
          <a href="https://en.wikipedia.org/wiki/Markdown" target="_blank" rel="noreferrer">
            Markdown
          </a>
          {` to format posts and comments on ${import.meta.env.VITE_SITENAME}. We support `}
          <a href="https://commonmark.org/" target="_blank" rel="noreferrer">
            CommonMark
          </a>
          {' and '}
          <a href="https://github.github.com/gfm/" target="_blank" rel="noreferrer">
            Github Flavored Markdown
          </a>
          {' (with the exception of image tags and raw HTML).'}
        </p>
        <h2>The Basics</h2>
        <table>
          <tbody>
            <tr>
              <td>Heading</td>
              <td># heading</td>
            </tr>
            <tr>
              <td>Bold</td>
              <td>**bold text**</td>
            </tr>
            <tr>
              <td>Italic</td>
              <td>*italic text*</td>
            </tr>
            <tr>
              <td>List</td>
              <td>
                - Item 1 <br />- Item 2
              </td>
            </tr>
            <tr>
              <td>Ordered list</td>
              <td>
                1. Item 1<br />
                2. Item 2
              </td>
            </tr>
            <tr>
              <td>Inline code</td>
              <td>`some inline code`</td>
            </tr>
            <tr>
              <td>Code block</td>
              <td>
                ```
                <br />
                some code here
                <br />
                ```
              </td>
            </tr>
            <tr>
              <td>Link</td>
              <td>[link-text](https://en.wikipedia.org)</td>
            </tr>
            <tr>
              <td>Blockquote</td>
              <td>{'> blockquote'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </StaticPage>
  );
};

export default MarkdownGuide;
