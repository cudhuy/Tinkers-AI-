'use client';

import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

interface MeetingsChartProps {
	data: {
		month: string;
		meetings: number;
	}[];
}

export function MeetingsChart({ data }: MeetingsChartProps) {
	return (
		<div className='px-4 py-2'>
			<h4 className='text-base font-medium'>Monthly Meetings</h4>
			<p className='text-sm text-muted-foreground'>
				Number of meetings per month
			</p>
			<div className='h-[200px] mt-4'>
				<ResponsiveContainer width='100%' height='100%'>
					<BarChart
						data={data}
						margin={{
							top: 10,
							right: 10,
							left: 0,
							bottom: 0,
						}}
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
														{payload[0].payload.month}
													</span>
												</div>
												<div className='flex flex-col'>
													<span className='text-[0.70rem] uppercase text-muted-foreground'>
														Meetings
													</span>
													<span className='font-bold text-xs'>
														{payload[0].value}
													</span>
												</div>
											</div>
										</div>
									);
								}
								return null;
							}}
						/>
						<Bar dataKey='meetings' fill='#000000' radius={[4, 4, 0, 0]} />
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
