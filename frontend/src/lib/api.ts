const API_BASE_URL = 'http://localhost:8000';

// Define types
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

type AgendaFormData = {
	title: string;
	purpose: string;
	context?: string | null;
	meeting_duration: string;
	type_of_meeting?: string | null;
	participants?: string[] | null;
};

/**
 * Base fetch function with error handling
 */
export async function fetchAPI<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const url = `${API_BASE_URL}${endpoint}`;

	console.log('Making API request to:', url);

	const defaultOptions: RequestInit = {
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		// Removed credentials and mode settings that might cause issues
	};

	try {
		const response = await fetch(url, {
			...defaultOptions,
			...options,
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('API error response:', {
				status: response.status,
				statusText: response.statusText,
				body: errorText,
			});
			throw new Error(errorText || `HTTP error! status: ${response.status}`);
		}

		return response.json();
	} catch (error) {
		console.error('Fetch error:', error);
		throw error;
	}
}

/**
 * API for agenda-related operations
 */
export const agendaAPI = {
	/**
	 * Create a new agenda
	 */
	createAgenda: async (formData: AgendaFormData): Promise<AgendaData> => {
		return fetchAPI<AgendaData>('/api/agenda/', {
			method: 'POST',
			body: JSON.stringify(formData),
		});
	},

	/**
	 * Chat with the agenda assistant to modify the agenda
	 */
	chatWithAgenda: async (
		message: string,
		conversation: { content: string; role: string }[] = [],
		currentAgenda: AgendaData | null = null,
	): Promise<AgendaData> => {
		return fetchAPI<AgendaData>('/api/agenda/chat', {
			method: 'POST',
			body: JSON.stringify({
				messages: conversation,
				agenda: currentAgenda,
			}),
		});
	},
};
