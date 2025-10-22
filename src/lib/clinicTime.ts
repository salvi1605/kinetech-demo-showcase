import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { todayYMD } from './historyStubs';

dayjs.extend(utc);
dayjs.extend(timezone);

export const CLINIC_TZ = 'America/Argentina/Buenos_Aires';

export const isSameYMD = (a: string, b: string): boolean => {
  return a === b;
};

export const formatYMD_ddMMyyyy = (ymd: string): string => {
  const [year, month, day] = ymd.split('-');
  return `${day}/${month}/${year}`;
};

export const isToday = (ymd: string, testCurrentDate?: string): boolean => {
  return isSameYMD(ymd, todayYMD(testCurrentDate));
};

export const isBefore = (ymd: string, reference: string): boolean => {
  return ymd < reference;
};
