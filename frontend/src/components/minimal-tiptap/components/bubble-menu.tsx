'use client';

import { BubbleMenu as TiptapBubbleMenu, type Editor } from '@tiptap/react';
import { Bold, Italic, Underline, Strikethrough, Code } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

interface BubbleMenuProps {
	editor: Editor;
}

export const BubbleMenu = ({ editor }: BubbleMenuProps) => {
	return (
		<TiptapBubbleMenu
			editor={editor}
			tippyOptions={{ duration: 150 }}
			className='flex items-center bg-background border rounded-md shadow-md overflow-hidden'
		>
			<Toggle
				size='sm'
				pressed={editor.isActive('bold')}
				onPressedChange={() => editor.chain().focus().toggleBold().run()}
				className='h-8 w-8 p-0 data-[state=on]:bg-muted rounded-none'
				aria-label='Toggle bold'
			>
				<Bold className='h-4 w-4' />
			</Toggle>
			<Toggle
				size='sm'
				pressed={editor.isActive('italic')}
				onPressedChange={() => editor.chain().focus().toggleItalic().run()}
				className='h-8 w-8 p-0 data-[state=on]:bg-muted rounded-none'
				aria-label='Toggle italic'
			>
				<Italic className='h-4 w-4' />
			</Toggle>
			<Toggle
				size='sm'
				pressed={editor.isActive('underline')}
				onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
				className='h-8 w-8 p-0 data-[state=on]:bg-muted rounded-none'
				aria-label='Toggle underline'
			>
				<Underline className='h-4 w-4' />
			</Toggle>
			<Toggle
				size='sm'
				pressed={editor.isActive('strike')}
				onPressedChange={() => editor.chain().focus().toggleStrike().run()}
				className='h-8 w-8 p-0 data-[state=on]:bg-muted rounded-none'
				aria-label='Toggle strikethrough'
			>
				<Strikethrough className='h-4 w-4' />
			</Toggle>
			<Toggle
				size='sm'
				pressed={editor.isActive('code')}
				onPressedChange={() => editor.chain().focus().toggleCode().run()}
				className='h-8 w-8 p-0 data-[state=on]:bg-muted rounded-none'
				aria-label='Toggle code'
			>
				<Code className='h-4 w-4' />
			</Toggle>
		</TiptapBubbleMenu>
	);
};
