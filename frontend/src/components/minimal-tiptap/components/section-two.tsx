'use client';

import type { Editor } from '@tiptap/react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';

interface SectionOneProps {
	editor: Editor;
	activeLevels?: number[];
	variant?: 'default' | 'outline' | 'ghost';
}

export const SectionOne = ({
	editor,
	activeLevels = [1, 2, 3, 4, 5, 6],
	variant = 'default',
}: SectionOneProps) => {
	const activeHeadingLevel = () => {
		if (editor.isActive('heading', { level: 1 })) return 'h1';
		if (editor.isActive('heading', { level: 2 })) return 'h2';
		if (editor.isActive('heading', { level: 3 })) return 'h3';
		if (editor.isActive('heading', { level: 4 })) return 'h4';
		if (editor.isActive('heading', { level: 5 })) return 'h5';
		if (editor.isActive('heading', { level: 6 })) return 'h6';
		return 'paragraph';
	};

	const toggleHeading = (level: number) => {
		if (level === 0) {
			editor.chain().focus().setParagraph().run();
		} else {
			editor.chain().focus().toggleHeading({ level }).run();
		}
	};

	const getCurrentHeadingLabel = () => {
		const current = activeHeadingLevel();
		switch (current) {
			case 'h1':
				return 'Heading 1';
			case 'h2':
				return 'Heading 2';
			case 'h3':
				return 'Heading 3';
			case 'h4':
				return 'Heading 4';
			case 'h5':
				return 'Heading 5';
			case 'h6':
				return 'Heading 6';
			default:
				return 'Paragraph';
		}
	};

	return (
		<div className='flex items-center gap-1 p-1'>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className='flex'>
						<Select
							value={activeHeadingLevel()}
							onValueChange={(value) => {
								if (value === 'paragraph') {
									toggleHeading(0);
								} else {
									toggleHeading(Number(value.replace('h', '')));
								}
							}}
						>
							<SelectTrigger
								className={`${
									variant === 'outline'
										? 'border'
										: variant === 'ghost'
										? 'border-0 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
										: 'border-0'
								} h-8 w-[140px] gap-1 rounded-md`}
							>
								<SelectValue placeholder={getCurrentHeadingLabel()} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='paragraph'>Paragraph</SelectItem>
								{activeLevels.includes(1) && (
									<SelectItem value='h1'>Heading 1</SelectItem>
								)}
								{activeLevels.includes(2) && (
									<SelectItem value='h2'>Heading 2</SelectItem>
								)}
								{activeLevels.includes(3) && (
									<SelectItem value='h3'>Heading 3</SelectItem>
								)}
								{activeLevels.includes(4) && (
									<SelectItem value='h4'>Heading 4</SelectItem>
								)}
								{activeLevels.includes(5) && (
									<SelectItem value='h5'>Heading 5</SelectItem>
								)}
								{activeLevels.includes(6) && (
									<SelectItem value='h6'>Heading 6</SelectItem>
								)}
							</SelectContent>
						</Select>
					</div>
				</TooltipTrigger>
				<TooltipContent side='bottom'>Text style</TooltipContent>
			</Tooltip>
		</div>
	);
};
