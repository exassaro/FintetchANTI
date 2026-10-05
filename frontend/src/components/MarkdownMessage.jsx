import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MarkdownMessage.css';

// Renders LLM output as Markdown. Raw HTML is intentionally not enabled
// (no rehype-raw) because the content is untrusted.
const MarkdownMessage = ({ children }) => (
    <div className="md-message">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
);

export default MarkdownMessage;
