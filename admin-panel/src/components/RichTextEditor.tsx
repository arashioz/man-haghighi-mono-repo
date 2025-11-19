import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  height?: number;
  placeholder?: string;
}

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ size: ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ direction: 'rtl' }],
  [{ align: [] }],
  ['blockquote', 'code-block'],
  ['link', 'image', 'video'],
  ['clean'],
];

const FORMATS = [
  'header',
  'font',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'script',
  'list',
  'bullet',
  'indent',
  'direction',
  'align',
  'blockquote',
  'code-block',
  'link',
  'image',
  'video',
];

const EMPTY_EDITOR_HTML = '<p><br></p>';

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  height = 400,
  placeholder = 'محتوای خود را وارد کنید...'
}) => {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const suppressChangeRef = useRef(false);

  const sanitizedValue = value ?? '';

  const modules = useMemo(
    () => ({
      toolbar: TOOLBAR_OPTIONS,
    }),
    []
  );

  const formats = useMemo(() => FORMATS, []);

  const applyEditorStyling = useCallback(
    (quill: Quill) => {
      const toolbarModule = quill.getModule('toolbar') as { container?: HTMLElement } | undefined;
      const wrapperElement =
        toolbarModule?.container?.parentElement ?? quill.root.parentElement;
      if (wrapperElement) {
        wrapperElement.style.height = `${height}px`;
      }
      quill.root.style.minHeight = `${height}px`;
      quill.root.style.direction = 'rtl';
      quill.root.style.textAlign = 'right';
      quill.root.dataset.placeholder = placeholder;
    },
    [height, placeholder]
  );

  const handleTextChange = useCallback(() => {
    if (!quillRef.current || suppressChangeRef.current) {
      return;
    }

    const html = quillRef.current.root.innerHTML;
    const normalized = html === EMPTY_EDITOR_HTML ? '' : html;
    onChange(normalized);
  }, [onChange]);

  useEffect(() => {
    if (!editorContainerRef.current || quillRef.current) {
      return;
    }

    const quill = new Quill(editorContainerRef.current, {
      theme: 'snow',
      modules,
      formats,
      placeholder,
    });

    quillRef.current = quill;
    applyEditorStyling(quill);

    quill.on('text-change', handleTextChange);

    suppressChangeRef.current = true;
    quill.clipboard.dangerouslyPasteHTML(sanitizedValue);
    suppressChangeRef.current = false;

    return () => {
      quill.off('text-change', handleTextChange);
      quillRef.current = null;
    };
  }, [applyEditorStyling, formats, handleTextChange, modules, placeholder]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) {
      return;
    }

    const currentHtml = quill.root.innerHTML;
    const normalizedIncoming = sanitizedValue || '';

    if (
      normalizedIncoming === (currentHtml === EMPTY_EDITOR_HTML ? '' : currentHtml)
    ) {
      return;
    }

    suppressChangeRef.current = true;
    const selection = quill.getSelection();
    quill.clipboard.dangerouslyPasteHTML(normalizedIncoming);
    if (selection) {
      quill.setSelection(selection);
    }
    suppressChangeRef.current = false;
  }, [sanitizedValue]);

  useEffect(() => {
    if (quillRef.current) {
      applyEditorStyling(quillRef.current);
    }
  }, [applyEditorStyling]);

  return (
    <div className="rich-text-editor-wrapper">
      <div ref={editorContainerRef} />
      <style>{`
        .rich-text-editor-wrapper .ql-container {
          min-height: ${height}px;
          font-family: inherit;
          font-size: 14px;
          margin-bottom: 50px;
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
