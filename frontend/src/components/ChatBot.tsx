'use client';

import React, { useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';

type Message = {
	id: string;
	content: string;
	role: 'user' | 'assistant';
};

export default function ChatBot() {
	const [messages, setMessages] = useState<Message[]>([
		{
			id: nanoid(),
			content:
				"Hello! I'm your virtual facilitator assistant. How can I help you today?",
			role: 'assistant',
		},
	]);

	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Function to handle sending messages
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (input.trim() === '') return;

		// Add user message
		const userMessage: Message = {
			id: nanoid(),
			content: input,
			role: 'user',
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput('');
		setLoading(true);

		try {
			// Simulate API response (replace with actual API call)
			setTimeout(() => {
				const botMessage: Message = {
					id: nanoid(),
					content:
						'This is a simulated response. You can connect this to your backend API.',
					role: 'assistant',
				};

				setMessages((prev) => [...prev, botMessage]);
				setLoading(false);
			}, 1000);
		} catch (error) {
			console.error('Error sending message:', error);
			setLoading(false);
		}
	};

	// Scroll to bottom of chat when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	return (
		<div className='flex flex-col w-full h-[700px] border rounded-lg overflow-hidden bg-white'>
			{/* Chat messages */}
			<div className='flex-1 overflow-y-auto p-4 space-y-4'>
				{messages.map((message) => (
					<div
						key={message.id}
						className={cn(
							'flex',
							message.role === 'user' ? 'justify-end' : 'justify-start',
						)}
					>
						<div
							className={cn(
								'max-w-[80%] rounded-lg p-3',
								message.role === 'user'
									? 'bg-black text-white'
									: 'bg-gray-100 text-gray-900',
							)}
						>
							<div className='whitespace-pre-wrap'>{message.content}</div>
						</div>
					</div>
				))}
				{loading && (
					<div className='flex justify-start'>
						<div className='bg-gray-100 rounded-lg p-3 max-w-[80%]'>
							<div className='flex space-x-2'>
								<div className='w-2 h-2 rounded-full bg-gray-300 animate-bounce' />
								<div className='w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0.2s]' />
								<div className='w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0.4s]' />
							</div>
						</div>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input area */}
			<form onSubmit={handleSubmit} className='border-t p-4'>
				<div className='flex gap-2'>
					<input
						type='text'
						placeholder='Type your message...'
						value={input}
						onChange={(e) => setInput(e.target.value)}
						disabled={loading}
						className='flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black'
					/>
					<button
						type='submit'
						disabled={loading || input.trim() === ''}
						className='bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50'
					>
						Send
					</button>
				</div>
			</form>
		</div>
	);
}
