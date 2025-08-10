'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { MinimalTiptapEditor } from '@/components/minimal-tiptap/MinimalTiptapEditor';
import { Content } from '@tiptap/react';
import { toast } from 'sonner';

interface Agenda {
	id: string;
	title: string;
	datetime: string;
	content: string;
}

export default function AgendaView() {
	const params = useParams();
	const agendaId = params.id as string;
	const [agenda, setAgenda] = useState<Agenda | null>(null);
	const [content, setContent] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchAgenda = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Only use the API endpoint for fetching agendas
				const response = await fetch(`/api/agendas/${agendaId}`);
				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Failed to fetch agenda');
				}

				const data = await response.json();
				setAgenda(data);
				setContent(data.content);
			} catch (error) {
				console.error('Error fetching agenda:', error);
				setError(
					'Failed to load agenda. Please try again or return to the dashboard.',
				);
			} finally {
				setIsLoading(false);
			}
		};

		fetchAgenda();
	}, [agendaId]);

	const handleSave = async () => {
		if (agenda) {
			setIsSaving(true);
			try {
				const response = await fetch(`/api/agendas/${agendaId}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ content }),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Failed to save agenda');
				}

				const updatedAgenda = await response.json();
				setAgenda(updatedAgenda);
				toast.success('Agenda saved successfully');
			} catch (error) {
				console.error('Error saving agenda:', error);
				toast.error(
					error instanceof Error ? error.message : 'Failed to save agenda',
				);
			} finally {
				setIsSaving(false);
			}
		}
	};

	// Handle content change from the editor
	const handleContentChange = (newContent: Content) => {
		// Since we're using output="html" in the editor, newContent will be a string
		setContent(newContent as string);
	};

	if (isLoading) {
		return (
			<div className='flex justify-center items-center min-h-screen'>
				Loading...
			</div>
		);
	}

	if (error || !agenda) {
		return (
			<div className='flex justify-center items-center min-h-screen'>
				<div className='text-center'>
					<h2 className='text-2xl font-bold mb-4'>
						{error || 'Agenda not found'}
					</h2>
					<Button asChild>
						<Link href='/'>Back to Dashboard</Link>
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className='flex min-h-screen flex-col'>
			<header className='sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<h1 className='font-semibold text-lg'>Agenda View</h1>
					</div>
					<div className='flex items-center gap-2'>
						<Button variant='outline' size='sm' asChild>
							<Link href='/'>Back to Dashboard</Link>
						</Button>
					</div>
				</div>
			</header>

			<main className='flex-1 p-4 md:p-6 space-y-6'>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between'>
						<div>
							<CardTitle className='text-2xl'>{agenda.title}</CardTitle>
							<div className='mt-2'>
								<Badge variant='outline'>
									{new Date(agenda.datetime).toLocaleDateString()} at{' '}
									{new Date(agenda.datetime).toLocaleTimeString([], {
										hour: '2-digit',
										minute: '2-digit',
									})}
								</Badge>
							</div>
						</div>
						<Button
							onClick={handleSave}
							className='bg-black text-white hover:bg-black/90'
							disabled={isSaving}
						>
							{isSaving ? 'Saving...' : 'Save Changes'}
						</Button>
					</CardHeader>

					<Separator />

					<CardContent className='pt-6'>
						<div className='border rounded-lg'>
							<MinimalTiptapEditor
								value={content}
								onChange={handleContentChange}
								placeholder='Enter agenda content...'
								editorContentClassName='p-4 min-h-[300px]'
								output='html'
								editable={true}
								imageExtensionOptions={{
									disabled: true, // Disable image support
								}}
							/>
						</div>
					</CardContent>
				</Card>
			</main>
		</div>
	);
}
