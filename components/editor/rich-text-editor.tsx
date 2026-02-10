'use client';

import { useTranslations } from 'next-intl';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Smile,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Eye,
  Paperclip,
  MessageSquare,
  Mic,
  ChevronDown,
  Type,
  Heading1,
  Heading2,
  Heading3,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadMediaImage } from '@/lib/storage';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
  userId?: string;
  showPreview?: boolean;
  disabled?: boolean;
}

const EMOJIS = ['😀', '😂', '😍', '🥰', '😘', '🤔', '😎', '🙄', '😢', '😡', '👍', '👎', '❤️', '🔥', '✨', '🎉', '👀', '💯', '🙏', '💪'];

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  minHeight = '200px',
  userId,
  showPreview = true,
  disabled = false,
}: RichTextEditorProps) {
  const t = useTranslations('editor');
  const [isPreview, setIsPreview] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[hsl(var(--forum-accent))] underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg my-4',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-invert max-w-none focus:outline-none min-h-[${minHeight}] p-4`,
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              handleImageUpload(file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;

        for (const file of Array.from(files)) {
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  const handleImageUpload = useCallback(async (file: File) => {
    if (!userId) {
      toast.error(t('loginToUpload'));
      return;
    }

    toast.loading(t('uploading'), { id: 'upload' });

    try {
      const result = await uploadMediaImage(file, userId);
      
      if (result.success && result.url) {
        editor?.chain().focus().setImage({ src: result.url }).run();
        toast.success(t('uploadSuccess'), { id: 'upload' });
      } else {
        toast.error(result.error || t('uploadError'), { id: 'upload' });
      }
    } catch (error) {
      toast.error(t('uploadError'), { id: 'upload' });
    }
  }, [editor, userId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const setLink = useCallback(() => {
    if (!linkUrl) {
      editor?.chain().focus().unsetLink().run();
      return;
    }

    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    editor?.chain().focus().setLink({ href: url }).run();
    setLinkUrl('');
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (!imageUrl) return;
    
    const url = imageUrl.startsWith('http') ? imageUrl : `https://${imageUrl}`;
    editor?.chain().focus().setImage({ src: url }).run();
    setImageUrl('');
  }, [editor, imageUrl]);

  const insertEmoji = useCallback((emoji: string) => {
    editor?.chain().focus().insertContent(emoji).run();
  }, [editor]);

  const insertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-[hsl(var(--forum-border))] rounded-lg overflow-hidden bg-[hsl(var(--forum-surface))]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[hsl(var(--forum-border))] bg-[hsl(var(--forum-surface-alt))]">
        {/* Text Format Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              <Type className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
              <Type className="h-4 w-4 mr-2" /> {t('paragraph')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <Heading1 className="h-4 w-4 mr-2" /> {t('heading1')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="h-4 w-4 mr-2" /> {t('heading2')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 className="h-4 w-4 mr-2" /> {t('heading3')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Basic Formatting */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-[hsl(var(--forum-accent))]/20' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title={`${t('bold')} (Ctrl+B)`}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-[hsl(var(--forum-accent))]/20' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title={`${t('italic')} (Ctrl+I)`}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-[hsl(var(--forum-accent))]/20' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title={`${t('underline')} (Ctrl+U)`}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('strike') ? 'bg-[hsl(var(--forum-accent))]/20' : ''}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title={t('strikethrough')}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-[hsl(var(--forum-accent))]/20' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title={t('list')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-[hsl(var(--forum-accent))]/20' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title={t('orderedList')}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        {/* Alignment Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              <AlignLeft className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('left').run()}>
              <AlignLeft className="h-4 w-4 mr-2" /> {t('alignLeft')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('center').run()}>
              <AlignCenter className="h-4 w-4 mr-2" /> {t('alignCenter')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('right').run()}>
              <AlignRight className="h-4 w-4 mr-2" /> {t('alignRight')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Link */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${editor.isActive('link') ? 'bg-[hsl(var(--forum-accent))]/20' : ''}`}
              title={t('insertLink')}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('linkUrl')}</label>
              <Input
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setLink()}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={setLink}>{t('insertLinkButton')}</Button>
                {editor.isActive('link') && (
                  <Button size="sm" variant="outline" onClick={() => editor.chain().focus().unsetLink().run()}>
                    {t('removeLink')}
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Image */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={t('insertImage')}>
              <ImageIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('imageUrl')}</label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addImage()}
                />
                <Button size="sm" onClick={addImage} className="w-full">{t('insertFromUrl')}</Button>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">{t('or')}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                {t('uploadFromDevice')}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Emoji */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={t('insertEmoji')}>
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="grid grid-cols-10 gap-1">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  className="text-xl hover:bg-[hsl(var(--forum-surface-alt))] p-1 rounded"
                  onClick={() => insertEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Quote */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-[hsl(var(--forum-accent))]/20' : ''}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title={t('quote')}
        >
          <Quote className="h-4 w-4" />
        </Button>

        {/* Code */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('codeBlock') ? 'bg-[hsl(var(--forum-accent))]/20' : ''}`}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title={t('codeBlock')}
        >
          <Code className="h-4 w-4" />
        </Button>

        {/* Table */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={insertTable}
          title={t('insertTable')}
        >
          <TableIcon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title={`${t('undo')} (Ctrl+Z)`}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title={`${t('redo')} (Ctrl+Y)`}
        >
          <Redo className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        {/* Preview Toggle */}
        {showPreview && (
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-2 ${isPreview ? 'bg-[hsl(var(--forum-accent))]/20' : ''}`}
            onClick={() => setIsPreview(!isPreview)}
          >
            <Eye className="h-4 w-4" />
            {t('preview')}
          </Button>
        )}
      </div>

      {/* Editor / Preview */}
      <div className={`relative ${isPreview ? 'hidden' : ''}`}>
        <EditorContent editor={editor} />
      </div>

      {isPreview && (
        <div
          className="prose prose-invert max-w-none p-4 min-h-[200px]"
          dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
        />
      )}

      {/* Bottom Toolbar */}
      <div className="flex items-center gap-2 p-2 border-t border-[hsl(var(--forum-border))] bg-[hsl(var(--forum-surface-alt))]">
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          {t('reply')}
        </Button>
        <Button variant="outline" size="sm" className="gap-2" disabled title={t('comingSoon')}>
          <Mic className="h-4 w-4" />
          {t('dictate')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
          {t('attachFiles')}
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}

export default RichTextEditor;
