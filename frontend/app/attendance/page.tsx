'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

export default function AttendancePage() {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);

  useEffect(() => {
    loadAttendance();
  }, []);

  async function loadAttendance() {
    const { data } = await supabase
      .from('attendance_logs')
      .select('*, employees(first_name, last_name, position)')
      .order('date', { ascending: false })
      .limit(50);

    setAttendanceData(data || []);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      case 'half_day':
        return 'bg-orange-100 text-orange-800';
      case 'work_from_home':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const todayAttendance = attendanceData.filter(
    (a) => new Date(a.date).toDateString() === new Date().toDateString()
  );

  const presentToday = todayAttendance.filter((a) => a.status === 'present').length;
  const absentToday = todayAttendance.filter((a) => a.status === 'absent').length;
  const wfhToday = todayAttendance.filter((a) => a.status === 'work_from_home').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Attendance Tracking</h1>
        <p className="text-slate-600 mt-1">Monitor employee attendance and patterns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Present Today</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{presentToday}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Absent Today</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{absentToday}</p>
              </div>
              <Calendar className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Work From Home</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{wfhToday}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Attendance Rate</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {todayAttendance.length > 0
                    ? Math.round((presentToday / todayAttendance.length) * 100)
                    : 0}
                  %
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Recent Attendance Records</CardTitle>
          <CardDescription>Latest attendance logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attendanceData.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No attendance records yet</p>
              </div>
            ) : (
              attendanceData.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900">
                        {record.employees?.first_name} {record.employees?.last_name}
                      </h3>
                      <p className="text-sm text-slate-600">{record.employees?.position}</p>
                    </div>
                    <div className="text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(record.date).toLocaleDateString()}
                      </div>
                      {record.check_in && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-4 h-4" />
                          {new Date(record.check_in).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {record.check_out &&
                            ` - ${new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(record.status)}>
                    {record.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
