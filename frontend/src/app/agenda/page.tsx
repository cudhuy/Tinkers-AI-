'use client';

import ChatBot, { Message } from '@/components/ChatBot';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function AgendaPage() {
	const [agendaAccepted, setAgendaAccepted] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [chatMessages, setChatMessages] = useState<Message[]>([]);
	const router = useRouter();

	// Process chat messages to create agenda content
	const createAgendaFromChat = () => {
		// Generate a default title based on the conversation
		let title = 'New Agenda';

		// Find a good candidate for the title from user messages
		const userMessages = chatMessages.filter((m) => m.role === 'user');
		if (userMessages.length > 0) {
			// Use the first user message that's not too long as a title
			for (const msg of userMessages) {
				if (msg.content.length > 5 && msg.content.length < 70) {
					title = msg.content;
					break;
				}
			}
		}

		// Get the last assistant message as the agenda content
		const assistantMessages = chatMessages.filter(
			(m) => m.role === 'assistant',
		);
		const lastAssistantMessage =
			assistantMessages.length > 0
				? assistantMessages[assistantMessages.length - 1]
				: null;

		// Format the content as HTML
		let content = '<h2>Meeting Agenda</h2>';

		if (lastAssistantMessage) {
			content += `<div class="agenda-content">
        <p>${lastAssistantMessage.content}</p>
      </div>`;
		} else {
			content += '<p>No agenda content available.</p>';
		}

		return { title, content };
	};

	const handleAcceptAgenda = async () => {
		try {
			setIsLoading(true);

			// Get title and content from chat messages
			const { title, content } = createAgendaFromChat();
			const datetime = new Date().toISOString();

			// Call the API endpoint to save the agenda
			const response = await fetch('/api/agenda', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ title, datetime, content }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create agenda');
			}

			const result = await response.json();
			console.log('Agenda created:', result);

			setAgendaAccepted(true);
			toast.success('Agenda created successfully!');

			// Redirect to homepage after a delay
			setTimeout(() => {
				router.push('/');
			}, 1500);
		} catch (error) {
			console.error('Error creating agenda:', error);
			toast.error(
				error instanceof Error ? error.message : 'Failed to create agenda',
			);
		} finally {
			setIsLoading(false);
		}
	};

	// Check if we have at least one assistant message
	const hasAssistantMessage = chatMessages.some(
		(message) => message.role === 'assistant',
	);

	return (
		<div className='flex min-h-screen flex-col items-center justify-center p-4 sm:p-8'>
			<div className='w-full max-w-6xl space-y-6'>
				{/* ChatBot UI */}
				<div>
					<ChatBot onMessagesChange={setChatMessages} />
				</div>

				{/* Accept Agenda Button */}
				<div className='flex justify-center mt-6'>
					<button
						onClick={handleAcceptAgenda}
						disabled={agendaAccepted || isLoading || !hasAssistantMessage}
						className='bg-black text-white px-8 py-3 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50 transition-all'
					>
						{isLoading
							? 'Creating...'
							: agendaAccepted
							? 'Agenda Accepted'
							: 'Accept Agenda'}
					</button>
				</div>
			</div>
		</div>
	);
}
