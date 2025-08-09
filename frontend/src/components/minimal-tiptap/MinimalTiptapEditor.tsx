'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, type Editor, Content } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Heading from '@tiptap/extension-heading';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { SectionOne } from './components/section-one';
import { SectionTwo } from './components/section-two';
import { SectionFour } from './components/section-four';
import { SectionFive } from './components/section-five';
import { BubbleMenu } from './components/bubble-menu';

export type ImageOptions = {
	disabled?: boolean;
	allowBase64?: boolean;
	maxFileSize?: number;
	acceptedImageFileTypes?: string[];
	onImageRemove?: (imageSrc: string) => Promise<boolean> | boolean;
	uploadFn?: (file: File, editor: Editor) => Promise<string>;
	onActionError?: (error: Error, props: { file: File; editor: Editor }) => void;
	onValidationError?: (errors: string[]) => void;
	onActionSuccess?: (
		url: string,
		props: { file: File; editor: Editor },
	) => void;
};

export interface MinimalTiptapEditorProps {
	value: Content;
	onChange: (value: Content) => void;
	className?: string;
	editorClassName?: string;
	editorContentClassName?: string;
	output?: 'html' | 'json' | 'text';
	placeholder?: string;
	autofocus?: boolean;
	editable?: boolean;
	throttleDelay?: number;
	imageExtensionOptions?: ImageOptions;
}

export const MinimalTiptapEditor = ({
	value,
	onChange,
	className = '',
	editorClassName = '',
	editorContentClassName = '',
	output = 'html',
	placeholder = 'Write something...',
	autofocus = false,
	editable = true,
	throttleDelay = 0,
	imageExtensionOptions = { disabled: true },
}: MinimalTiptapEditorProps) => {
	const [isMounted, setIsMounted] = useState(false);

	// Configure image extension with our custom options
	const configuredImage = imageExtensionOptions.disabled
		? null
		: Image.configure({
				allowBase64: imageExtensionOptions.allowBase64 ?? false,
				HTMLAttributes: {
					class: 'rounded-md max-w-full mx-auto',
				},
		  });

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				bulletList: {
					HTMLAttributes: {
						class: 'list-disc ml-4',
					},
				},
				orderedList: {
					HTMLAttributes: {
						class: 'list-decimal ml-4',
					},
				},
				code: {
					HTMLAttributes: {
						class:
							'rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm',
					},
				},
				codeBlock: {
					HTMLAttributes: {
						class:
							'rounded-md bg-muted p-4 font-mono text-sm my-4 overflow-x-auto',
					},
				},
				blockquote: {
					HTMLAttributes: {
						class: 'border-l-4 border-muted pl-4 italic',
					},
				},
				horizontalRule: {
					HTMLAttributes: {
						class: 'my-4 border-t border-muted',
					},
				},
			}),
			Placeholder.configure({
				placeholder,
				emptyEditorClass:
					'before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:h-0 before:pointer-events-none',
			}),
			Underline,
			Link.configure({
				HTMLAttributes: {
					class: 'text-primary underline underline-offset-2 cursor-pointer',
				},
			}),
			TextStyle,
			Color,
			Typography,
			Heading.configure({
				levels: [1, 2, 3, 4, 5, 6],
				HTMLAttributes: {
					class: 'font-bold',
				},
			}),
			HorizontalRule.configure({
				HTMLAttributes: {
					class: 'my-4 border-t border-muted',
				},
			}),
			// Only add image extension if not disabled
			...(configuredImage ? [configuredImage] : []),
		],
		content: value,
		editable,
		autofocus,
		onUpdate: ({ editor }) => {
			const getContent = () => {
				switch (output) {
					case 'html':
						return editor.getHTML();
					case 'json':
						return editor.getJSON();
					case 'text':
						return editor.getText();
					default:
						return editor.getHTML();
				}
			};

			if (throttleDelay > 0) {
				const timeoutId = setTimeout(() => {
					onChange(getContent());
				}, throttleDelay);

				return () => clearTimeout(timeoutId);
			} else {
				onChange(getContent());
			}
		},
	});

	useEffect(() => {
		setIsMounted(true);
	}, []);

	if (!isMounted) {
		return null;
	}

	return (
		<div className={`flex flex-col w-full space-y-2 ${className}`}>
			{editor && (
				<div className='flex flex-wrap border rounded-md p-1 shadow-sm'>
					<SectionOne
						editor={editor}
						activeLevels={[1, 2, 3]}
						variant='ghost'
					/>
					<SectionTwo
						editor={editor}
						activeActions={['bold', 'italic', 'underline', 'strike', 'code']}
						mainActionCount={3}
					/>
					<SectionFour
						editor={editor}
						activeActions={['bulletList', 'orderedList']}
						mainActionCount={2}
					/>
					<SectionFive
						editor={editor}
						activeActions={['codeBlock', 'blockquote', 'horizontalRule']}
						mainActionCount={2}
					/>
				</div>
			)}

			<div
				className={`border rounded-md overflow-hidden shadow-sm ${editorClassName}`}
			>
				{editor && <BubbleMenu editor={editor} />}

				<EditorContent
					editor={editor}
					className={`prose prose-sm max-w-none ${editorContentClassName}`}
				/>
			</div>
		</div>
	);
};
