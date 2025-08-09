'use client';

import { Code2, Quote, Minus } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import type { Editor } from '@tiptap/react';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';

interface SectionFiveProps {
	editor: Editor;
	activeActions?: string[];
	mainActionCount?: number;
}

export const SectionFive = ({
	editor,
	activeActions = ['codeBlock', 'blockquote', 'horizontalRule'],
	mainActionCount = 2,
}: SectionFiveProps) => {
	const showIcon = (action: string) => activeActions.includes(action);
	const isMainAction = (index: number) => index < mainActionCount;

	return (
		<div className='flex items-center'>
			<div className='flex items-center'>
				{showIcon('codeBlock') && isMainAction(0) && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Toggle
								size='sm'
								pressed={editor.isActive('codeBlock')}
								onPressedChange={() =>
									editor.chain().focus().toggleCodeBlock().run()
								}
								className='h-8 w-8 p-0 data-[state=on]:bg-muted'
								aria-label='Toggle code block'
							>
								<Code2 className='h-4 w-4' />
							</Toggle>
						</TooltipTrigger>
						<TooltipContent side='bottom'>Code block</TooltipContent>
					</Tooltip>
				)}

				{showIcon('blockquote') && isMainAction(1) && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Toggle
								size='sm'
								pressed={editor.isActive('blockquote')}
								onPressedChange={() =>
									editor.chain().focus().toggleBlockquote().run()
								}
								className='h-8 w-8 p-0 data-[state=on]:bg-muted'
								aria-label='Toggle blockquote'
							>
								<Quote className='h-4 w-4' />
							</Toggle>
						</TooltipTrigger>
						<TooltipContent side='bottom'>Blockquote</TooltipContent>
					</Tooltip>
				)}

				{showIcon('horizontalRule') && isMainAction(2) && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Toggle
								size='sm'
								pressed={false}
								onPressedChange={() =>
									editor.chain().focus().setHorizontalRule().run()
								}
								className='h-8 w-8 p-0'
								aria-label='Add horizontal rule'
							>
								<Minus className='h-4 w-4' />
							</Toggle>
						</TooltipTrigger>
						<TooltipContent side='bottom'>Horizontal rule</TooltipContent>
					</Tooltip>
				)}
			</div>
		</div>
	);
};
