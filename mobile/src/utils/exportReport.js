import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from '../api/client';

const MIME = {
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

// Downloads the report from the server, saves it, and opens the share sheet
export async function exportReport(fmt, params) {
  const res = await api.get(`/reports/attendance/export/${fmt}/`, {
    params,
    responseType: 'arraybuffer',
    timeout: 60000,
  });
  const name = `attendance_${params.from}_${params.to}.${fmt === 'excel' ? 'xlsx' : 'pdf'}`;
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(new Uint8Array(res.data));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(file.uri, { mimeType: MIME[fmt], dialogTitle: 'Attendance report' });
}