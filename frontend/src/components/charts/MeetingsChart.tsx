'use client';

import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

interface MeetingsChartProps {
	data: {
		month: string;
		meetings: number;
		successful: number;
	}[];
}

export function MeetingsChart({ data }: MeetingsChartProps) {
	// Make sure all data points have the successful property
	const enhancedData = data.map((item) => ({
		...item,
		successful: item.successful || 0,
	}));

	return (
		<div className='px-4 py-2'>
			<h4 className='text-base font-medium'>Monthly Meetings</h4>
			<p className='text-sm text-muted-foreground'>
				Total vs. successful meetings
			</p>
			<div className='h-[200px] mt-4'>
				<ResponsiveContainer width='100%' height='100%'>
					<BarChart
						data={enhancedData}
						margin={{
							top: 10,
							right: 10,
							left: 0,
							bottom: 0,
						}}
						barGap={0}
					>
						<CartesianGrid
							strokeDasharray='3 3'
							className='stroke-muted'
							vertical={false}
						/>
						<XAxis dataKey='month' className='text-xs' />
						<YAxis className='text-xs' />
						<Tooltip
							content={({ active, payload }) => {
								if (active && payload && payload.length) {
									return (
										<div className='rounded-lg border bg-background p-2 shadow-sm'>
											<div className='grid grid-cols-2 gap-2'>
												<div className='flex flex-col'>
													<span className='text-[0.70rem] uppercase text-muted-foreground'>
														Month
													</span>
													<span className='font-bold text-xs'>
														{payload[0]?.payload.month}
													</span>
												</div>
												<div className='flex flex-col'>
													<span className='text-[0.70rem] uppercase text-muted-foreground'>
														Total
													</span>
													<span className='font-bold text-xs'>
														{payload[0]?.value}
													</span>
												</div>
												<div className='flex flex-col'>
													<span className='text-[0.70rem] uppercase text-muted-foreground'>
														Successful
													</span>
													<span className='font-bold text-xs'>
														{payload[1]?.value}
													</span>
												</div>
											</div>
										</div>
									);
								}
								return null;
							}}
						/>
						<Legend />
						<Bar
							dataKey='meetings'
							name='Total Meetings'
							fill='#000000'
							radius={[4, 4, 0, 0]}
						/>
						<Bar
							dataKey='successful'
							name='Successful Meetings'
							fill='#22c55e'
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
