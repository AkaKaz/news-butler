export const Timestamp = {
  now: () => ({seconds: 1000000, nanoseconds: 0}),
  fromDate: (date: Date) => ({
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  }),
};
