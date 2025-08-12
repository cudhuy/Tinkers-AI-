'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
	X,
	Plus,
	Clock,
	PlusCircle,
	Trash2,
	CalendarIcon,
	ClipboardList,
	BookOpen,
	Users,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

interface ParticipantInsight {
	participant: string;
	insight: string;
}

interface TimePlanPoint {
	[key: string]: string; // "00:00 - 00:05": "Introduction"
}

interface Agenda {
	id: string;
	title: string;
	datetime: string;
	checklist: string[];
	preparation_tips: string[];
	time_plan: TimePlanPoint[];
	participant_insights: ParticipantInsight[];
}

export default function AgendaView() {
	const params = useParams();
	const agendaId = params.id as string;
	const [agenda, setAgenda] = useState<Agenda | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// State for editable fields
	const [title, setTitle] = useState('');
	const [checklist, setChecklist] = useState<string[]>([]);
	const [preparationTips, setPreparationTips] = useState<string[]>([]);
	const [timePlan, setTimePlan] = useState<TimePlanPoint[]>([]);
	const [participantInsights, setParticipantInsights] = useState<
		ParticipantInsight[]
	>([]);

	useEffect(() => {
		const fetchAgenda = async () => {
			try {
				setIsLoading(true);
				setError(null);

				const response = await fetch(`/api/agendas/${agendaId}`);
				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Failed to fetch agenda');
				}

				const data = await response.json();
				setAgenda(data);

				// Initialize state with fetched data
				setTitle(data.title);
				setChecklist(data.checklist || []);
				setPreparationTips(data.preparation_tips || []);
				setTimePlan(data.time_plan || []);
				setParticipantInsights(data.participant_insights || []);
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
		if (!agenda) return;

		setIsSaving(true);
		try {
			const response = await fetch(`/api/agendas/${agendaId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					title,
					checklist,
					preparation_tips: preparationTips,
					time_plan: timePlan,
					participant_insights: participantInsights,
				}),
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
	};

	// Handlers for list modifications
	const addChecklistItem = () => {
		setChecklist([...checklist, '']);
	};

	const updateChecklistItem = (index: number, value: string) => {
		const updated = [...checklist];
		updated[index] = value;
		setChecklist(updated);
	};

	const removeChecklistItem = (index: number) => {
		setChecklist(checklist.filter((_, i) => i !== index));
	};

	const addPreparationTip = () => {
		setPreparationTips([...preparationTips, '']);
	};

	const updatePreparationTip = (index: number, value: string) => {
		const updated = [...preparationTips];
		updated[index] = value;
		setPreparationTips(updated);
	};

	const removePreparationTip = (index: number) => {
		setPreparationTips(preparationTips.filter((_, i) => i !== index));
	};

	const addTimePlanPoint = () => {
		setTimePlan([...timePlan, { '00:00 - 00:00': '' }]);
	};

	const updateTimePlanPoint = (
		index: number,
		timeSlot: string,
		activity: string,
	) => {
		const updated = [...timePlan];
		// Remove old key and add new one
		const oldKey = Object.keys(updated[index])[0];
		const newPoint = { [timeSlot]: activity };
		updated[index] = newPoint;
		setTimePlan(updated);
	};

	const removeTimePlanPoint = (index: number) => {
		setTimePlan(timePlan.filter((_, i) => i !== index));
	};

	const addParticipantInsight = () => {
		setParticipantInsights([
			...participantInsights,
			{ participant: '', insight: '' },
		]);
	};

	const updateParticipantInsight = (
		index: number,
		field: 'participant' | 'insight',
		value: string,
	) => {
		const updated = [...participantInsights];
		updated[index] = { ...updated[index], [field]: value };
		setParticipantInsights(updated);
	};

	const removeParticipantInsight = (index: number) => {
		setParticipantInsights(participantInsights.filter((_, i) => i !== index));
	};

	if (isLoading) {
		return (
			<div className='flex justify-center items-center min-h-screen'>
				<div className='animate-pulse text-lg'>Loading agenda...</div>
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
		<div className='flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900'>
			<header className='sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 shadow-sm'>
				<div className='flex items-center justify-between max-w-7xl mx-auto'>
					<div className='flex items-center gap-2'>
						<h1 className='font-semibold text-lg'>Agenda Editor</h1>
					</div>
					<div className='flex items-center gap-2'>
						<Button
							onClick={handleSave}
							className='bg-primary text-primary-foreground hover:bg-primary/90'
							disabled={isSaving}
							size='sm'
						>
							{isSaving ? 'Saving...' : 'Save Changes'}
						</Button>
						<Button variant='outline' size='sm' asChild>
							<Link href='/'>Back to Dashboard</Link>
						</Button>
					</div>
				</div>
			</header>

			<main className='flex-1 p-4 md:px-8 md:py-6 max-w-7xl mx-auto w-full'>
				<Card className='mb-6'>
					<CardHeader>
						<div className='flex items-center gap-2 flex-wrap'>
							<CalendarIcon className='h-5 w-5 text-muted-foreground' />
							<Badge variant='outline' className='font-normal'>
								{new Date(agenda.datetime).toLocaleDateString()} at{' '}
								{new Date(agenda.datetime).toLocaleTimeString([], {
									hour: '2-digit',
									minute: '2-digit',
								})}
							</Badge>
						</div>
						<div className='mt-2'>
							<Label htmlFor='title' className='text-sm font-medium'>
								Agenda Title
							</Label>
							<Input
								id='title'
								className='text-2xl font-bold mt-1'
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder='Enter agenda title...'
							/>
						</div>
					</CardHeader>
				</Card>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					{/* Left Column */}
					<div className='space-y-6'>
						{/* Checklist Card */}
						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<ClipboardList className='h-5 w-5 text-muted-foreground' />
										<CardTitle>Checklist</CardTitle>
									</div>
									<Button
										variant='outline'
										size='sm'
										onClick={addChecklistItem}
										className='h-8'
									>
										<Plus className='h-4 w-4 mr-1' /> Add Item
									</Button>
								</div>
								<CardDescription>
									Key tasks and objectives for this meeting
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className='w-full'>Item</TableHead>
											<TableHead className='w-[60px]'></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{checklist.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={2}
													className='text-center text-muted-foreground py-6'
												>
													No checklist items yet. Add one to get started.
												</TableCell>
											</TableRow>
										) : (
											checklist.map((item, index) => (
												<TableRow key={`checklist-${index}`}>
													<TableCell>
														<Input
															value={item}
															onChange={(e) =>
																updateChecklistItem(index, e.target.value)
															}
															placeholder='Checklist item'
															className='border-0 bg-transparent focus-visible:ring-0 p-0 shadow-none'
														/>
													</TableCell>
													<TableCell className='text-right'>
														<Button
															variant='ghost'
															size='icon'
															onClick={() => removeChecklistItem(index)}
															className='h-8 w-8'
														>
															<Trash2 className='h-4 w-4 text-muted-foreground hover:text-destructive' />
														</Button>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</CardContent>
						</Card>

						{/* Preparation Tips Card */}
						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<BookOpen className='h-5 w-5 text-muted-foreground' />
										<CardTitle>Preparation Tips</CardTitle>
									</div>
									<Button
										variant='outline'
										size='sm'
										onClick={addPreparationTip}
										className='h-8'
									>
										<Plus className='h-4 w-4 mr-1' /> Add Tip
									</Button>
								</div>
								<CardDescription>
									Guidance to help prepare for the meeting
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='space-y-3'>
									{preparationTips.length === 0 ? (
										<div className='text-center text-muted-foreground py-6'>
											No preparation tips yet. Add one to get started.
										</div>
									) : (
										preparationTips.map((tip, index) => (
											<div
												key={`prep-tip-${index}`}
												className='relative border rounded-lg p-4 bg-background'
											>
												<Button
													variant='ghost'
													size='icon'
													onClick={() => removePreparationTip(index)}
													className='absolute top-2 right-2 h-8 w-8'
												>
													<X className='h-4 w-4 text-muted-foreground hover:text-destructive' />
												</Button>
												<Textarea
													value={tip}
													onChange={(e) =>
														updatePreparationTip(index, e.target.value)
													}
													placeholder='Add preparation tip...'
													className='min-h-[80px] border-0 focus-visible:ring-0 p-0 pr-12 shadow-none resize-none'
												/>
											</div>
										))
									)}
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Right Column */}
					<div className='space-y-6'>
						{/* Time Plan Card */}
						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<Clock className='h-5 w-5 text-muted-foreground' />
										<CardTitle>Time Plan</CardTitle>
									</div>
									<Button
										variant='outline'
										size='sm'
										onClick={addTimePlanPoint}
										className='h-8'
									>
										<Plus className='h-4 w-4 mr-1' /> Add Time Slot
									</Button>
								</div>
								<CardDescription>
									Schedule and timeline for the meeting
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Time Slot</TableHead>
											<TableHead>Activity</TableHead>
											<TableHead className='w-[60px]'></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{timePlan.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={3}
													className='text-center text-muted-foreground py-6'
												>
													No time plan entries yet. Add one to get started.
												</TableCell>
											</TableRow>
										) : (
											timePlan.map((point, index) => {
												const timeSlot = Object.keys(point)[0];
												const activity = point[timeSlot];
												return (
													<TableRow key={`time-plan-${index}`}>
														<TableCell>
															<Input
																value={timeSlot}
																onChange={(e) =>
																	updateTimePlanPoint(
																		index,
																		e.target.value,
																		activity,
																	)
																}
																placeholder='00:00 - 00:00'
																className='border-0 bg-transparent focus-visible:ring-0 p-0 shadow-none'
															/>
														</TableCell>
														<TableCell>
															<Input
																value={activity}
																onChange={(e) =>
																	updateTimePlanPoint(
																		index,
																		timeSlot,
																		e.target.value,
																	)
																}
																placeholder='Activity description'
																className='border-0 bg-transparent focus-visible:ring-0 p-0 shadow-none'
															/>
														</TableCell>
														<TableCell className='text-right'>
															<Button
																variant='ghost'
																size='icon'
																onClick={() => removeTimePlanPoint(index)}
																className='h-8 w-8'
															>
																<Trash2 className='h-4 w-4 text-muted-foreground hover:text-destructive' />
															</Button>
														</TableCell>
													</TableRow>
												);
											})
										)}
									</TableBody>
								</Table>
							</CardContent>
						</Card>

						{/* Participant Insights Card */}
						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<Users className='h-5 w-5 text-muted-foreground' />
										<CardTitle>Participant Insights</CardTitle>
									</div>
									<Button
										variant='outline'
										size='sm'
										onClick={addParticipantInsight}
										className='h-8'
									>
										<PlusCircle className='h-4 w-4 mr-1' /> Add Participant
									</Button>
								</div>
								<CardDescription>
									Understanding participants and their perspectives
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='space-y-4'>
									{participantInsights.length === 0 ? (
										<div className='text-center text-muted-foreground py-6'>
											No participant insights yet. Add one to get started.
										</div>
									) : (
										participantInsights.map((insight, index) => (
											<Card
												key={`participant-insight-${index}`}
												className='border bg-background/50'
											>
												<CardHeader className='p-4 pb-2'>
													<div className='flex justify-between items-center'>
														<Label
															htmlFor={`participant-${index}`}
															className='text-sm font-bold'
														>
															Participant Name/Role
														</Label>
														<Button
															variant='ghost'
															size='icon'
															onClick={() => removeParticipantInsight(index)}
															className='h-8 w-8'
														>
															<X className='h-4 w-4 text-muted-foreground hover:text-destructive' />
														</Button>
													</div>
													<Input
														id={`participant-${index}`}
														value={insight.participant}
														onChange={(e) =>
															updateParticipantInsight(
																index,
																'participant',
																e.target.value,
															)
														}
														placeholder='Participant name/role'
														className='mt-1 border-0 bg-transparent focus-visible:ring-0 p-0 shadow-none font-medium'
													/>
												</CardHeader>
												<CardContent className='p-4 pt-2'>
													<Label
														htmlFor={`insight-${index}`}
														className='text-sm font-bold'
													>
														Insight
													</Label>
													<Textarea
														id={`insight-${index}`}
														value={insight.insight}
														onChange={(e) =>
															updateParticipantInsight(
																index,
																'insight',
																e.target.value,
															)
														}
														placeholder='What this participant cares about...'
														className='mt-1 min-h-[80px] border-0 focus-visible:ring-0 p-0 shadow-none resize-none'
													/>
												</CardContent>
											</Card>
										))
									)}
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</div>
	);
}
