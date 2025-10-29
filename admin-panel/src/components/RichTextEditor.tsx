import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  height?: number;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  height = 400,
  placeholder = 'محتوای خود را وارد کنید...'
}) => {
  // تنظیمات toolbar
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet',
    'indent',
    'direction', 'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ];

  return (
    <div className="rich-text-editor-wrapper">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ height: `${height}px`, marginBottom: '50px' }}
      />
      <style>{`
        .rich-text-editor-wrapper .ql-container {
          min-height: ${height}px;
          font-family: inherit;
          font-size: 14px;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: ${height}px;
          direction: rtl;
          text-align: right;
        }
        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          right: 15px;
          left: auto;
          text-align: right;
          font-style: normal;
          color: #9ca3af;
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker {
          direction: ltr;
        }
        .rich-text-editor-wrapper .ql-toolbar {
          background: #f9fafb;
          border-color: #e5e7eb;
          border-radius: 0.5rem 0.5rem 0 0;
        }
        .rich-text-editor-wrapper .ql-container {
          border-color: #e5e7eb;
          border-radius: 0 0 0.5rem 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
