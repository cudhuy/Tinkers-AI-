'use client';

import React, {
	useEffect,
	useRef,
	useState,
	Dispatch,
	SetStateAction,
} from 'react';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import { agendaAPI } from '@/lib/api';

export type Message = {
	id: string;
	content: string;
	role: 'user' | 'assistant';
};

// Import types from API utility (these would typically be in a separate types file)
// We're redefining them here to avoid circular imports, but in a real app,
// you'd create a separate types.ts file and import from there
type TimePlanPoint = {
	start: string;
	end: string;
	content: string;
};

type ParticipantInsight = {
	participant: string;
	insight: string;
};

type AgendaData = {
	checklist: string[];
	time_plan: TimePlanPoint[];
	preparation_tips: string[];
	participants_insights: ParticipantInsight[];
};

// Define type for WebSocket engagement data
type EngagementData = {
	words_count: number;
	user_type: 'host' | 'guest';
};

// Thêm interface cho props của ChatBot
interface ChatBotProps {
	onMessagesChange?: Dispatch<SetStateAction<Message[]>>;
}

export default function ChatBot(props: ChatBotProps) {
	const { onMessagesChange } = props; // Props để cập nhật state ở parent component

	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [agendaData, setAgendaData] = useState<AgendaData | null>(null);
	const [previousAgendaHash, setPreviousAgendaHash] = useState<string | null>(
		null,
	);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	
	// WebSocket connection reference
	const wsRef = useRef<WebSocket | null>(null);

	// Setup WebSocket connection for engagement data
	useEffect(() => {
		const connectWebSocket = () => {
			if (wsRef.current?.readyState === WebSocket.OPEN) {
				return;
			}

			// Create new WebSocket connection
			const ws = new WebSocket('ws://localhost:8000/api/engagement');

			ws.onopen = () => {
				console.log('Engagement WebSocket connection established');
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data) as EngagementData;
					if (data.words_count && data.user_type) {
						// Dispatch custom event to share engagement data with other components
						window.dispatchEvent(
							new CustomEvent('engagementUpdate', {
								detail: {
									words_count: data.words_count,
									user_type: data.user_type,
								},
							}),
						);
					}
				} catch (error) {
					console.error('Error parsing WebSocket message:', error);
				}
			};

			ws.onerror = (error) => {
				console.error('WebSocket error:', error);
			};

			ws.onclose = () => {
				console.log('WebSocket connection closed');
				// Attempt to reconnect after 3 seconds
				setTimeout(connectWebSocket, 3000);
			};

			wsRef.current = ws;
		};

		// Connect to WebSocket
		connectWebSocket();

		// Cleanup on component unmount
		return () => {
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, []);

	// Generate a simple hash for agenda data to detect changes
	const getAgendaHash = (data: AgendaData | null): string => {
		if (!data) return '';
		// Create a simple hash from the first item of each section
		return [
			data.checklist[0] || '',
			data.time_plan[0]?.content || '',
			data.preparation_tips[0] || '',
		].join('|');
	};

	// Fetch initial agenda data and chat history from localStorage on component mount
	useEffect(() => {
		const storedData = localStorage.getItem('agendaData');
		const storedMessages = localStorage.getItem('chatMessages');

		if (storedData) {
			try {
				const data = JSON.parse(storedData) as AgendaData;
				setAgendaData(data);
				const currentHash = getAgendaHash(data);
				setPreviousAgendaHash(currentHash);

				// Only load saved messages if they exist and we have agenda hash saved
				if (
					storedMessages &&
					localStorage.getItem('agendaHash') === currentHash
				) {
					try {
						const parsedMessages = JSON.parse(storedMessages) as Message[];
						setMessages(parsedMessages);
					} catch (error) {
						console.error('Error parsing chat messages:', error);
						addInitialMessage();
					}
				} else {
					// If hash doesn't match or no messages, add initial message
					addInitialMessage();
				}
			} catch (error) {
				console.error('Error parsing agenda data:', error);
				addInitialMessage();
			}
		} else {
			// No agenda data
			setMessages([
				{
					id: nanoid(),
					content:
						"Hello! I'm your virtual facilitator assistant. Please create an agenda first.",
					role: 'assistant',
				},
			]);
		}
	}, []);

	// Function to add initial welcome message
	const addInitialMessage = () => {
		const initialMessage = {
			id: nanoid(),
			content:
				"Hello! I'm your virtual facilitator assistant. Your agenda has been created. You can ask me questions about it or request changes.",
			role: 'assistant' as const,
		};
		setMessages([initialMessage]);
	};

	// Update previousAgendaHash when agendaData changes
	useEffect(() => {
		if (agendaData) {
			const newHash = getAgendaHash(agendaData);

			// If the hash changed (new agenda), clear chat history
			if (previousAgendaHash && newHash !== previousAgendaHash) {
				// Clear chat history and add initial message
				addInitialMessage();
			}

			// Update the hash in state and localStorage
			setPreviousAgendaHash(newHash);
			localStorage.setItem('agendaHash', newHash);
		}
	}, [agendaData, previousAgendaHash]);

	// Save messages to localStorage whenever they change
	useEffect(() => {
		if (messages.length > 0) {
			localStorage.setItem('chatMessages', JSON.stringify(messages));
		}
	}, [messages]);

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
			// Convert messages to the format expected by the backend
			const conversationHistory = messages.map((msg) => ({
				content: msg.content,
				role: msg.role,
			}));

			// Add the new user message
			conversationHistory.push({
				content: input,
				role: 'user',
			});

			// Use the API utility with conversation history and current agenda
			const data = await agendaAPI.chatWithAgenda(
				input,
				conversationHistory,
				agendaData,
			);

			// Update agendaData state to trigger the useEffect that checks for changes
			setAgendaData(data);

			// Update localStorage with the new agenda data
			localStorage.setItem('agendaData', JSON.stringify(data));

			// Add assistant message
			const botMessage: Message = {
				id: nanoid(),
				content:
					"I've updated the agenda based on your request. The changes have been applied.",
				role: 'assistant',
			};

			setMessages((prev) => [...prev, botMessage]);

			// Dispatch custom event to notify other components of agenda update
			window.dispatchEvent(new CustomEvent('agendaUpdated', { detail: data }));
		} catch (error) {
			console.error('Error sending message:', error);

			// Add error message
			const errorMessage: Message = {
				id: nanoid(),
				content:
					'Sorry, there was an error processing your request. Please try again.',
				role: 'assistant',
			};

			setMessages((prev) => [...prev, errorMessage]);
		} finally {
			setLoading(false);
		}
	};

	// Scroll to bottom of chat when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	// Function to display agenda data as a formatted string
	const formatAgendaDataForDisplay = (data: AgendaData): string => {
		let formattedText = '**Current Agenda:**\n\n';

		// Checklist
		formattedText += '**Checklist:**\n';
		data.checklist.forEach((item, index) => {
			formattedText += `${index + 1}. ${item}\n`;
		});

		// Time Plan
		formattedText += '\n**Time Plan:**\n';
		data.time_plan.forEach((point) => {
			formattedText += `${point.start} - ${point.end}: ${point.content}\n`;
		});

		return formattedText;
	};

	// Thêm useEffect để gọi onMessagesChange khi messages thay đổi
	useEffect(() => {
		if (onMessagesChange) {
			onMessagesChange(messages); // Gọi hàm callback để cập nhật state ở parent component
		}
	}, [messages, onMessagesChange]);

	return (
		<div className='flex flex-col w-full h-full border rounded-lg overflow-hidden bg-white'>
			{/* Chat messages */}
			<div className='flex-1 overflow-y-auto p-2 space-y-2'>
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
								'max-w-[85%] rounded-lg p-2 text-sm',
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
						<div className='bg-gray-100 rounded-lg p-2 max-w-[85%]'>
							<div className='flex space-x-1'>
								<div className='w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce' />
								<div className='w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0.2s]' />
								<div className='w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0.4s]' />
							</div>
						</div>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input area */}
			<form onSubmit={handleSubmit} className='border-t p-2'>
				<div className='flex gap-2'>
					<input
						type='text'
						placeholder='Provide feedback or request changes to the agenda...'
						value={input}
						onChange={(e) => setInput(e.target.value)}
						disabled={loading}
						className='flex-1 border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
					/>
					<button
						type='submit'
						disabled={loading || input.trim() === ''}
						className='bg-black text-white px-3 py-1 text-sm rounded-md hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50'
					>
						Send
					</button>
				</div>
			</form>
		</div>
	);
}
