'use client';

import { ListOrdered, List } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import type { Editor } from '@tiptap/react';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';

interface SectionFourProps {
	editor: Editor;
	activeActions?: string[];
	mainActionCount?: number;
}

export const SectionFour = ({
	editor,
	activeActions = ['bulletList', 'orderedList'],
	mainActionCount = 2,
}: SectionFourProps) => {
	const showIcon = (action: string) => activeActions.includes(action);
	const isMainAction = (index: number) => index < mainActionCount;

	return (
		<div className='flex items-center'>
			<div className='flex items-center'>
				{showIcon('bulletList') && isMainAction(0) && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Toggle
								size='sm'
								pressed={editor.isActive('bulletList')}
								onPressedChange={() =>
									editor.chain().focus().toggleBulletList().run()
								}
								className='h-8 w-8 p-0 data-[state=on]:bg-muted'
								aria-label='Toggle bullet list'
							>
								<List className='h-4 w-4' />
							</Toggle>
						</TooltipTrigger>
						<TooltipContent side='bottom'>Bullet list</TooltipContent>
					</Tooltip>
				)}

				{showIcon('orderedList') && isMainAction(1) && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Toggle
								size='sm'
								pressed={editor.isActive('orderedList')}
								onPressedChange={() =>
									editor.chain().focus().toggleOrderedList().run()
								}
								className='h-8 w-8 p-0 data-[state=on]:bg-muted'
								aria-label='Toggle ordered list'
							>
								<ListOrdered className='h-4 w-4' />
							</Toggle>
						</TooltipTrigger>
						<TooltipContent side='bottom'>Ordered list</TooltipContent>
					</Tooltip>
				)}
			</div>

			<Separator orientation='vertical' className='mx-1 h-6' />
		</div>
	);
};
