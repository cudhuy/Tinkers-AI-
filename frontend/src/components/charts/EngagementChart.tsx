'use client';

import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

interface EngagementChartProps {
	data: {
		date: string;
		engagement: number;
	}[];
}

export function EngagementChart({ data }: EngagementChartProps) {
	return (
		<div className='px-4 py-2'>
			<h4 className='text-base font-medium'></h4>
			<p className='text-sm text-muted-foreground'>
				Percentage of user engagement in call
			</p>
			<div className='h-[200px] mt-4'>
				<ResponsiveContainer width='100%' height='100%'>
					<AreaChart
						data={data}
						margin={{
							top: 10,
							right: 10,
							left: 0,
							bottom: 0,
						}}
					>
						<defs>
							<linearGradient id='colorEngagement' x1='0' y1='0' x2='0' y2='1'>
								<stop offset='5%' stopColor='#000000' stopOpacity={0.8} />
								<stop offset='95%' stopColor='#000000' stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
						<XAxis
							dataKey='date'
							axisLine={false}
							tickLine={false}
							tick={false} // Remove the tick labels entirely
						/>
						<YAxis
							className='text-xs'
							domain={[0, 100]}
							tickFormatter={(value) => `${value}%`}
						/>
						<Tooltip
							content={({ active, payload }) => {
								if (active && payload && payload.length) {
									return (
										<div className='rounded-lg border bg-background p-2 shadow-sm'>
											<div className='flex flex-col gap-1'>
												<span className='font-bold text-xs'>
													{payload[0].value}% engagement
												</span>
											</div>
										</div>
									);
								}
								return null;
							}}
						/>
						<Area
							type='monotone'
							dataKey='engagement'
							stroke='#000000'
							fillOpacity={1}
							fill='url(#colorEngagement)'
							isAnimationActive={true}
							animationDuration={500}
							animationEasing='ease-out'
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
