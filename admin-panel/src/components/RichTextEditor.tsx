import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { uploadsService, API_ORIGIN } from '../services/api';

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
  const isInitializedRef = useRef(false);

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

  // Setup image upload handler
  const setupImageHandler = useCallback((quill: Quill) => {
    const toolbar = quill.getModule('toolbar') as any;
    if (toolbar && typeof toolbar.addHandler === 'function') {
      toolbar.addHandler('image', () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;

          // Check file size (max 10MB)
          if (file.size > 10 * 1024 * 1024) {
            alert('حجم فایل نباید بیشتر از 10 مگابایت باشد');
            return;
          }

          // Check file type
          if (!file.type.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
            alert('فقط فایل‌های تصویری مجاز هستند (JPG, PNG, GIF, WebP)');
            return;
          }

          const range = quill.getSelection(true);
          if (!range) return;

          const placeholderText = 'در حال آپلود عکس...';
          const placeholderLength = placeholderText.length;
          const insertIndex = range.index;

          // Insert a placeholder
          quill.insertText(insertIndex, placeholderText, 'user');
          quill.setSelection(insertIndex + placeholderLength);

          try {
            // Upload image
            const response = await uploadsService.uploadImage(file);
            let imageUrl = response.original || response.processed || response.thumbnail;
            
            if (!imageUrl) {
              throw new Error('آدرس عکس دریافت نشد');
            }

            // Construct full URL if it's a relative path
            if (imageUrl.startsWith('/')) {
              imageUrl = `${API_ORIGIN}${imageUrl}`;
            }

            // Remove placeholder and insert image at the original position
            quill.deleteText(insertIndex, placeholderLength);
            quill.insertEmbed(insertIndex, 'image', imageUrl, 'user');
          } catch (error: any) {
            // Remove placeholder on error - find it by searching from the insert position
            try {
              const text = quill.getText(insertIndex, placeholderLength);
              if (text === placeholderText) {
                quill.deleteText(insertIndex, placeholderLength);
                quill.setSelection(insertIndex);
              }
            } catch (e) {
              // If deletion fails, try to find and remove the placeholder
              const fullText = quill.getText();
              const foundIndex = fullText.indexOf(placeholderText);
              if (foundIndex !== -1) {
                quill.deleteText(foundIndex, placeholderLength);
                quill.setSelection(foundIndex);
              }
            }
            alert('خطا در آپلود عکس: ' + (error.response?.data?.message || error.message || 'خطای نامشخص'));
          }
        };
      });
    }
  }, []);

  // Initialize Quill only once
  useEffect(() => {
    if (!editorContainerRef.current || isInitializedRef.current) {
      return;
    }

    // Store ref value to avoid stale closure in cleanup
    const editorElement = editorContainerRef.current;

    // Clear any existing content
    if (editorElement.firstChild) {
      editorElement.innerHTML = '';
    }

    const quill = new Quill(editorElement, {
      theme: 'snow',
      modules,
      formats,
      placeholder,
    });

    quillRef.current = quill;
    isInitializedRef.current = true;
    applyEditorStyling(quill);
    setupImageHandler(quill);

    quill.on('text-change', handleTextChange);

    suppressChangeRef.current = true;
    quill.clipboard.dangerouslyPasteHTML(sanitizedValue);
    suppressChangeRef.current = false;

    return () => {
      if (quillRef.current) {
        quillRef.current.off('text-change', handleTextChange);
        // Properly destroy Quill instance
        if (editorElement) {
          editorElement.innerHTML = '';
        }
        quillRef.current = null;
        isInitializedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only initialize once

  // Update content when value prop changes (but not from user input)
  useEffect(() => {
    const quill = quillRef.current;
    if (!quill || !isInitializedRef.current) {
      return;
    }

    const currentHtml = quill.root.innerHTML;
    const normalizedIncoming = sanitizedValue || '';
    const normalizedCurrent = currentHtml === EMPTY_EDITOR_HTML ? '' : currentHtml;

    if (normalizedIncoming === normalizedCurrent) {
      return;
    }

    suppressChangeRef.current = true;
    const selection = quill.getSelection();
    quill.clipboard.dangerouslyPasteHTML(normalizedIncoming);
    if (selection) {
      // Try to restore selection, but only if it's still valid
      try {
        quill.setSelection(selection);
      } catch (e) {
        // Selection might be invalid after content change, ignore
      }
    }
    suppressChangeRef.current = false;
  }, [sanitizedValue]);

  // Update styling when height or placeholder changes
  useEffect(() => {
    if (quillRef.current && isInitializedRef.current) {
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
