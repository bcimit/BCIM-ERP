import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Screen from '../components/Screen';
import { Card, EmptyState, Label, Value } from '../components/Card';
import {
  actionManagerAttendanceCorrection,
  actionManagerLeaveRequest,
  cancelEssLeaveRequest,
  getEssPayslip,
  getEssSummary,
  listAttendanceCorrections,
  listEssAttendance,
  listEssLeaveBalances,
  listEssLeaveRequests,
  listEssNotifications,
  listEssDocuments,
  listEssOnboarding,
  listEssPayslips,
  listManagerAttendanceCorrections,
  listManagerLeaveRequests,
  submitAttendanceCorrection,
  submitEssLeaveRequest,
  updateEssOnboardingItem,
  uploadEssDocument,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { currency, theme } from '../theme';

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function todayParts() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function dateOnly(value) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

function Pill({ text, color = theme.colors.primary }) {
  return (
    <View style={{ backgroundColor: `${color}18`, borderColor: `${color}44`, borderWidth: 1, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Text style={{ color, fontWeight: '900', fontSize: 11, textTransform: 'uppercase' }}>{text || '-'}</Text>
    </View>
  );
}

function SegmentButton({ active, label, icon, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: '48%',
        backgroundColor: active ? theme.colors.primary : '#fff',
        borderColor: active ? theme.colors.primary : theme.colors.border,
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 10,
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Ionicons name={icon} size={16} color={active ? '#fff' : theme.colors.primary} />
      <Text style={{ color: active ? '#fff' : theme.colors.text, fontWeight: '900' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function MiniMetric({ label, value, color = theme.colors.text }) {
  return (
    <Card style={{ flex: 1, minWidth: '45%', marginBottom: 0 }}>
      <Label>{label}</Label>
      <Value color={color}>{value}</Value>
    </Card>
  );
}

function payslipHtml(slip) {
  return `<!doctype html>
  <html><head><meta charset="utf-8"><style>
  body{font-family:Arial,sans-serif;color:#071327;padding:28px}
  .head{border-bottom:3px solid #0f2d64;padding-bottom:12px;margin-bottom:18px}
  h1{margin:0;color:#0f2d64;font-size:22px}.muted{color:#64748b;font-size:12px}
  table{width:100%;border-collapse:collapse;margin-top:14px}td,th{border:1px solid #dbe5f2;padding:9px;text-align:left}
  th{background:#0f2d64;color:white}.total{font-size:18px;font-weight:800;color:#0f9f6e}
  </style></head><body>
  <div class="head"><h1>${slip.company_name || 'BCIM Engineering Pvt Ltd'}</h1><div class="muted">Employee Payslip - ${MONTHS[slip.month]} ${slip.year}</div></div>
  <table><tr><th>Employee</th><td>${slip.employee_name || '-'}</td><th>Code</th><td>${slip.employee_code || '-'}</td></tr>
  <tr><th>Department</th><td>${slip.department_name || '-'}</td><th>Designation</th><td>${slip.designation_name || '-'}</td></tr>
  <tr><th>PAN</th><td>${slip.pan_number || '-'}</td><th>UAN</th><td>${slip.uan_number || '-'}</td></tr></table>
  <table><tr><th>Earnings</th><th>Amount</th><th>Deductions</th><th>Amount</th></tr>
  <tr><td>Gross Earnings</td><td>${currency(slip.gross_earnings)}</td><td>Total Deductions</td><td>${currency(slip.total_deductions)}</td></tr>
  <tr><td>Paid Days</td><td>${slip.paid_days || '-'}</td><td>LOP Days</td><td>${slip.lop_days || 0}</td></tr>
  <tr><td colspan="3" class="total">Net Pay</td><td class="total">${currency(slip.net_pay)}</td></tr></table>
  <p class="muted">Computer generated payslip from BCIM ERP.</p></body></html>`;
}

const MANAGER_ROLES = new Set(['super_admin', 'admin', 'hr_admin', 'hr_manager', 'project_manager', 'project_head', 'department_head']);

function isManager(user) {
  return MANAGER_ROLES.has(String(user?.role || '').toLowerCase());
}

function LeaveApplyModal({ visible, balances, onClose, onSubmit }) {
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const firstBalance = balances[0];

  useEffect(() => {
    if (visible && !leaveTypeId && firstBalance?.leave_type_id) setLeaveTypeId(firstBalance.leave_type_id);
  }, [visible, firstBalance?.leave_type_id, leaveTypeId]);

  const submit = () => {
    if (!leaveTypeId || !fromDate || !toDate) {
      Alert.alert('Required', 'Select leave type and enter from/to dates in YYYY-MM-DD format.');
      return;
    }
    onSubmit({ leave_type_id: leaveTypeId, from_date: fromDate, to_date: toDate, reason });
    setFromDate('');
    setToDate('');
    setReason('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(7,19,39,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.text }}>Apply Leave</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close-circle-outline" size={28} color={theme.colors.muted} /></TouchableOpacity>
          </View>

          <Label>Leave Type</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 12 }}>
            {balances.map((balance) => (
              <TouchableOpacity
                key={balance.leave_type_id}
                onPress={() => setLeaveTypeId(balance.leave_type_id)}
                style={{
                  borderRadius: 12,
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: leaveTypeId === balance.leave_type_id ? theme.colors.primary : theme.colors.border,
                  backgroundColor: leaveTypeId === balance.leave_type_id ? '#eaf0ff' : '#fff',
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '900' }}>{balance.leave_type_name}</Text>
                <Text style={{ color: theme.colors.muted, fontWeight: '800', fontSize: 11 }}>Bal: {balance.closing_balance}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Label>From Date</Label>
          <TextInput value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" style={inputStyle} />
          <Label>To Date</Label>
          <TextInput value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" style={inputStyle} />
          <Label>Reason</Label>
          <TextInput value={reason} onChangeText={setReason} placeholder="Reason" multiline style={[inputStyle, { height: 80, textAlignVertical: 'top' }]} />

          <TouchableOpacity onPress={submit} style={{ backgroundColor: theme.colors.primary, padding: 15, borderRadius: 14, alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '900' }}>Submit Leave Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function CorrectionModal({ visible, onClose, onSubmit }) {
  const [attendanceDate, setAttendanceDate] = useState('');
  const [status, setStatus] = useState('present');
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [reason, setReason] = useState('');

  const submit = () => {
    if (!attendanceDate || !reason) {
      Alert.alert('Required', 'Enter attendance date and reason.');
      return;
    }
    onSubmit({
      attendance_date: attendanceDate,
      requested_status: status,
      requested_in_time: inTime || null,
      requested_out_time: outTime || null,
      reason,
    });
    setAttendanceDate('');
    setStatus('present');
    setInTime('');
    setOutTime('');
    setReason('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(7,19,39,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.text }}>Attendance Correction</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close-circle-outline" size={28} color={theme.colors.muted} /></TouchableOpacity>
          </View>

          <Label>Attendance Date</Label>
          <TextInput value={attendanceDate} onChangeText={setAttendanceDate} placeholder="YYYY-MM-DD" style={inputStyle} />
          <Label>Status</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 12 }}>
            {['present', 'half_day', 'absent'].map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setStatus(item)}
                style={{
                  borderRadius: 12,
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: status === item ? theme.colors.primary : theme.colors.border,
                  backgroundColor: status === item ? '#eaf0ff' : '#fff',
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '900', textTransform: 'capitalize' }}>{item.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Label>In Time</Label>
          <TextInput value={inTime} onChangeText={setInTime} placeholder="09:30" style={inputStyle} />
          <Label>Out Time</Label>
          <TextInput value={outTime} onChangeText={setOutTime} placeholder="18:00" style={inputStyle} />
          <Label>Reason</Label>
          <TextInput value={reason} onChangeText={setReason} placeholder="Correction reason" multiline style={[inputStyle, { height: 80, textAlignVertical: 'top' }]} />

          <TouchableOpacity onPress={submit} style={{ backgroundColor: theme.colors.primary, padding: 15, borderRadius: 14, alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '900' }}>Submit Correction</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: theme.colors.border,
  borderRadius: 12,
  padding: 12,
  marginTop: 6,
  marginBottom: 12,
  color: theme.colors.text,
  fontWeight: '800',
  backgroundColor: '#f8fafc',
};

export default function ESSScreen() {
  const { user } = useAuth();
  const canApprove = isManager(user);
  const { month: initialMonth, year: initialYear } = todayParts();
  const [active, setActive] = useState('attendance');
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [balances, setBalances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [onboarding, setOnboarding] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [managerLeaves, setManagerLeaves] = useState([]);
  const [managerCorrections, setManagerCorrections] = useState([]);
  const [showLeave, setShowLeave] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [sum, att, bal, leaveReqs, pays, notes, docs, onboardingItems, correctionReqs] = await Promise.all([
        getEssSummary(month, year),
        listEssAttendance(month, year),
        listEssLeaveBalances(year),
        listEssLeaveRequests(),
        listEssPayslips(),
        listEssNotifications(),
        listEssDocuments(),
        listEssOnboarding(),
        listAttendanceCorrections(),
      ]);
      setSummary(sum?.data || {});
      setAttendance(att || []);
      setBalances(bal || []);
      setLeaves(leaveReqs || []);
      setPayslips(pays || []);
      setNotifications(notes || []);
      setDocuments(docs || []);
      setOnboarding(onboardingItems || []);
      setCorrections(correctionReqs || []);

      if (canApprove) {
        const [pendingLeaves, pendingCorrections] = await Promise.all([
          listManagerLeaveRequests('pending'),
          listManagerAttendanceCorrections('pending'),
        ]);
        setManagerLeaves(pendingLeaves || []);
        setManagerCorrections(pendingCorrections || []);
      } else {
        setManagerLeaves([]);
        setManagerCorrections([]);
      }
    } catch (err) {
      Alert.alert('ESS Error', err.message || 'Unable to load ESS details');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [canApprove, month, year]);

  function goMonth(delta) {
    let nm = month + delta;
    let ny = year;
    if (nm < 1) { nm = 12; ny = year - 1; }
    else if (nm > 12) { nm = 1; ny = year + 1; }
    const now = todayParts();
    if (ny > now.year || (ny === now.year && nm > now.month)) return;
    setMonth(nm);
    setYear(ny);
  }

  const attendanceStats = summary?.attendance || {};
  const leaveStats = summary?.leave || {};
  const currentPayroll = summary?.payroll;

  async function submitLeave(data) {
    try {
      await submitEssLeaveRequest(data);
      setShowLeave(false);
      Alert.alert('Submitted', 'Leave request submitted for approval.');
      load();
    } catch (err) {
      Alert.alert('Leave Error', err.message || 'Unable to submit leave');
    }
  }

  async function cancelLeave(id) {
    try {
      await cancelEssLeaveRequest(id);
      Alert.alert('Cancelled', 'Leave request cancelled.');
      load();
    } catch (err) {
      Alert.alert('Cancel Error', err.message || 'Unable to cancel leave');
    }
  }

  async function submitCorrection(data) {
    try {
      await submitAttendanceCorrection(data);
      setShowCorrection(false);
      Alert.alert('Submitted', 'Attendance correction sent for approval.');
      load();
    } catch (err) {
      Alert.alert('Correction Error', err.message || 'Unable to submit correction');
    }
  }

  async function actionLeave(id, action) {
    try {
      await actionManagerLeaveRequest(id, action);
      Alert.alert('Updated', `Leave request ${action === 'approve' ? 'approved' : 'rejected'}.`);
      load();
    } catch (err) {
      Alert.alert('Approval Error', err.message || 'Unable to update leave request');
    }
  }

  async function actionCorrection(id, action) {
    try {
      await actionManagerAttendanceCorrection(id, action);
      Alert.alert('Updated', `Correction request ${action === 'approve' ? 'approved' : 'rejected'}.`);
      load();
    } catch (err) {
      Alert.alert('Approval Error', err.message || 'Unable to update correction request');
    }
  }

  async function viewPayslip(id) {
    try {
      const res = await getEssPayslip(id);
      const slip = res?.data;
      Alert.alert(
        `Payslip ${MONTHS[slip.month]} ${slip.year}`,
        `Gross: ${currency(slip.gross_earnings)}\nDeductions: ${currency(slip.total_deductions)}\nNet Pay: ${currency(slip.net_pay)}`
      );
    } catch (err) {
      Alert.alert('Payslip Error', err.message || 'Unable to open payslip');
    }
  }

  async function downloadPayslip(id) {
    try {
      const res = await getEssPayslip(id);
      const slip = res?.data;
      const printed = await Print.printToFileAsync({ html: payslipHtml(slip), base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(printed.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Payslip ${MONTHS[slip.month]} ${slip.year}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Created', printed.uri);
      }
    } catch (err) {
      Alert.alert('PDF Error', err.message || 'Unable to create payslip PDF');
    }
  }

  async function pickAndUploadDocument() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      const asset = picked.assets?.[0];
      if (!asset) return;
      const form = new FormData();
      form.append('doc_type', 'employee_document');
      form.append('doc_name', asset.name || 'Employee Document');
      form.append('file', {
        uri: asset.uri,
        name: asset.name || 'employee-document',
        type: asset.mimeType || 'application/octet-stream',
      });
      await uploadEssDocument(form);
      Alert.alert('Uploaded', 'Document uploaded successfully.');
      load();
    } catch (err) {
      Alert.alert('Upload Error', err.message || 'Unable to upload document');
    }
  }

  async function toggleOnboarding(item) {
    try {
      const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
      await updateEssOnboardingItem(item.id, { status: nextStatus });
      load();
    } catch (err) {
      Alert.alert('Checklist Error', err.message || 'Unable to update checklist');
    }
  }

  return (
    <Screen
      title="Employee Self Service"
      subtitle={`${MONTHS[month]} ${year}`}
      right={<TouchableOpacity onPress={load}><Ionicons name="refresh" size={24} color="#fff" /></TouchableOpacity>}
    >
      {loading ? (
        <Card style={{ alignItems: 'center', paddingVertical: 36 }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ marginTop: 10, color: theme.colors.muted, fontWeight: '800' }}>Loading ESS...</Text>
        </Card>
      ) : (
        <>
          <Card>
            <Label>Employee</Label>
            <Value>{summary?.profile?.name || 'My ESS'}</Value>
            <Text style={{ color: theme.colors.muted, marginTop: 6, fontWeight: '800' }}>
              {summary?.profile?.department_name || 'Department'} • {summary?.profile?.designation_name || 'Designation'}
            </Text>
          </Card>

          {/* Month / Year navigator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 14, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 10 }}>
            <TouchableOpacity onPress={() => goMonth(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={{ fontWeight: '900', color: theme.colors.text, fontSize: 16, minWidth: 100, textAlign: 'center' }}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity
              onPress={() => goMonth(1)}
              disabled={year === todayParts().year && month >= todayParts().month}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ padding: 4, opacity: (year === todayParts().year && month >= todayParts().month) ? 0.3 : 1 }}
            >
              <Ionicons name="chevron-forward" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <SegmentButton active={active === 'attendance'} icon="calendar-outline" label="Attendance" onPress={() => setActive('attendance')} />
            <SegmentButton active={active === 'leave'} icon="airplane-outline" label="Leave" onPress={() => setActive('leave')} />
            <SegmentButton active={active === 'payslips'} icon="wallet-outline" label="Payslips" onPress={() => setActive('payslips')} />
            <SegmentButton active={active === 'documents'} icon="document-attach-outline" label="Docs" onPress={() => setActive('documents')} />
            <SegmentButton active={active === 'onboarding'} icon="checkbox-outline" label="Joining" onPress={() => setActive('onboarding')} />
            <SegmentButton active={active === 'notifications'} icon="notifications-outline" label="Alerts" onPress={() => setActive('notifications')} />
            {canApprove && <SegmentButton active={active === 'manager'} icon="shield-checkmark-outline" label="Approvals" onPress={() => setActive('manager')} />}
          </View>

          {active === 'attendance' && (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <MiniMetric label="Present" value={attendanceStats.present || 0} color={theme.colors.success} />
                <MiniMetric label="Absent" value={attendanceStats.absent || 0} color={theme.colors.danger} />
                <MiniMetric label="Leave" value={attendanceStats.on_leave || 0} color={theme.colors.primary2} />
                <MiniMetric label="Late Min" value={attendanceStats.late_minutes || 0} color={theme.colors.text} />
              </View>
              <TouchableOpacity onPress={() => setShowCorrection(true)} style={{ backgroundColor: theme.colors.primary, padding: 14, borderRadius: 14, alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>Request Attendance Correction</Text>
              </TouchableOpacity>
              <CorrectionModal visible={showCorrection} onClose={() => setShowCorrection(false)} onSubmit={submitCorrection} />
              {attendance.length ? attendance.map((row) => (
                <Card key={row.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Label>{dateOnly(row.attendance_date)}</Label>
                      <Value>{row.in_time || '-'} - {row.out_time || '-'}</Value>
                    </View>
                    <Pill text={row.status} color={row.status === 'present' ? theme.colors.success : row.status === 'absent' ? theme.colors.danger : theme.colors.primary2} />
                  </View>
                  {!!row.remarks && <Text style={{ color: theme.colors.muted, marginTop: 8, fontWeight: '800' }}>{row.remarks}</Text>}
                </Card>
              )) : <EmptyState text="No attendance marked for this month." />}
              {!!corrections.length && (
                <>
                  <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 16, marginTop: 8, marginBottom: 8 }}>Correction Requests</Text>
                  {corrections.slice(0, 5).map((item) => (
                    <Card key={item.id}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Label>{dateOnly(item.attendance_date)}</Label>
                          <Value>{item.requested_status || 'present'}</Value>
                          <Text style={{ color: theme.colors.muted, fontWeight: '800', marginTop: 6 }}>{item.reason || '-'}</Text>
                        </View>
                        <Pill text={item.status} color={item.status === 'approved' ? theme.colors.success : item.status === 'rejected' ? theme.colors.danger : theme.colors.primary2} />
                      </View>
                    </Card>
                  ))}
                </>
              )}
            </>
          )}

          {active === 'leave' && (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <MiniMetric label="Pending" value={leaveStats.pending || 0} color={theme.colors.primary2} />
                <MiniMetric label="Approved" value={leaveStats.approved || 0} color={theme.colors.success} />
              </View>
              <TouchableOpacity onPress={() => setShowLeave(true)} style={{ backgroundColor: theme.colors.primary, padding: 14, borderRadius: 14, alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>Apply Leave</Text>
              </TouchableOpacity>
              {balances.map((item) => (
                <Card key={item.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View>
                      <Label>{item.code}</Label>
                      <Value>{item.leave_type_name}</Value>
                    </View>
                    <Value color={theme.colors.success}>{item.closing_balance}</Value>
                  </View>
                </Card>
              ))}
              <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 16, marginTop: 8, marginBottom: 8 }}>Leave History</Text>
              {leaves.length ? leaves.map((item) => (
                <Card key={item.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Label>{item.leave_type_name}</Label>
                      <Value>{dateOnly(item.from_date)} to {dateOnly(item.to_date)}</Value>
                      <Text style={{ color: theme.colors.muted, fontWeight: '800', marginTop: 6 }}>{item.days} day(s) • {item.reason || 'No reason'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                      <Pill text={item.status} color={item.status === 'approved' ? theme.colors.success : item.status === 'rejected' ? theme.colors.danger : theme.colors.primary2} />
                      {item.status === 'pending' && (
                        <TouchableOpacity onPress={() => cancelLeave(item.id)}>
                          <Text style={{ color: theme.colors.danger, fontWeight: '900' }}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </Card>
              )) : <EmptyState text="No leave requests yet." />}
              <LeaveApplyModal visible={showLeave} balances={balances} onClose={() => setShowLeave(false)} onSubmit={submitLeave} />
            </>
          )}

          {active === 'payslips' && (
            <>
              <Card>
                <Label>Current Month Payroll</Label>
                <Value color={currentPayroll ? theme.colors.success : theme.colors.muted}>{currentPayroll ? currency(currentPayroll.net_pay) : 'Not released'}</Value>
                <Text style={{ color: theme.colors.muted, marginTop: 6, fontWeight: '800' }}>{currentPayroll?.status || 'Payslip will show after payroll approval/payment'}</Text>
              </Card>
              {payslips.length ? payslips.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => viewPayslip(item.id)}>
                  <Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Label>{MONTHS[item.month]} {item.year}</Label>
                        <Value>{currency(item.net_pay)}</Value>
                        <Text style={{ color: theme.colors.muted, marginTop: 6, fontWeight: '800' }}>Paid days: {item.paid_days || '-'} • LOP: {item.lop_days || 0}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 8 }}>
                        <Ionicons name="chevron-forward" size={22} color={theme.colors.muted} />
                        <TouchableOpacity onPress={() => downloadPayslip(item.id)} style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>PDF</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              )) : <EmptyState text="No released payslips found." />}
            </>
          )}

          {active === 'documents' && (
            <>
              <TouchableOpacity onPress={pickAndUploadDocument} style={{ backgroundColor: theme.colors.primary, padding: 14, borderRadius: 14, alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>Upload Employee Document</Text>
              </TouchableOpacity>
              {documents.length ? documents.map((doc) => (
                <Card key={doc.id}>
                  <Label>{doc.doc_type || 'Document'}</Label>
                  <Value>{doc.doc_name || 'Employee Document'}</Value>
                  <Text style={{ color: theme.colors.muted, fontWeight: '800', marginTop: 6 }}>{dateOnly(doc.uploaded_at)}</Text>
                  <Text style={{ color: theme.colors.primary, fontWeight: '900', marginTop: 8 }}>{doc.file_url || '-'}</Text>
                </Card>
              )) : <EmptyState text="No employee documents uploaded." />}
            </>
          )}

          {active === 'onboarding' && (
            <>
              <Card>
                <Label>Onboarding Progress</Label>
                <Value>{onboarding.filter((item) => item.status === 'completed').length}/{onboarding.length}</Value>
              </Card>
              {onboarding.length ? onboarding.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => toggleOnboarding(item)}>
                  <Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Label>{item.owner_department || 'Owner'}</Label>
                        <Value>{item.title}</Value>
                        {!!item.remarks && <Text style={{ color: theme.colors.muted, fontWeight: '800', marginTop: 6 }}>{item.remarks}</Text>}
                      </View>
                      <Pill text={item.status} color={item.status === 'completed' ? theme.colors.success : theme.colors.primary2} />
                    </View>
                  </Card>
                </TouchableOpacity>
              )) : <EmptyState text="No onboarding checklist found." />}
            </>
          )}

          {active === 'notifications' && (
            <>
              <Card>
                <Label>Unread Notifications</Label>
                <Value>{summary?.notifications?.unread || 0}</Value>
              </Card>
              {notifications.length ? notifications.map((item) => (
                <Card key={item.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Label>{item.type || 'Notification'}</Label>
                      <Value>{item.title}</Value>
                      <Text style={{ color: theme.colors.muted, fontWeight: '800', marginTop: 6 }}>{item.body || dateOnly(item.created_at)}</Text>
                    </View>
                    {!item.is_read && <View style={{ width: 10, height: 10, borderRadius: 10, backgroundColor: theme.colors.accent, marginTop: 6 }} />}
                  </View>
                </Card>
              )) : <EmptyState text="No notifications." />}
            </>
          )}

          {active === 'manager' && canApprove && (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <MiniMetric label="Leave Pending" value={managerLeaves.length} color={theme.colors.primary2} />
                <MiniMetric label="Corrections" value={managerCorrections.length} color={theme.colors.accent} />
              </View>

              <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 16, marginBottom: 8 }}>Leave Approvals</Text>
              {managerLeaves.length ? managerLeaves.map((item) => (
                <Card key={item.id}>
                  <Label>{item.employee_name} - {item.leave_type_name}</Label>
                  <Value>{dateOnly(item.from_date)} to {dateOnly(item.to_date)}</Value>
                  <Text style={{ color: theme.colors.muted, fontWeight: '800', marginTop: 6 }}>{item.days} day(s) - {item.reason || 'No reason'}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity onPress={() => actionLeave(item.id, 'approve')} style={{ flex: 1, backgroundColor: theme.colors.success, padding: 12, borderRadius: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '900' }}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => actionLeave(item.id, 'reject')} style={{ flex: 1, backgroundColor: theme.colors.danger, padding: 12, borderRadius: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '900' }}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              )) : <EmptyState text="No leave approvals pending." />}

              <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 16, marginTop: 8, marginBottom: 8 }}>Attendance Corrections</Text>
              {managerCorrections.length ? managerCorrections.map((item) => (
                <Card key={item.id}>
                  <Label>{item.employee_name} - {dateOnly(item.attendance_date)}</Label>
                  <Value>{item.requested_status || 'present'}</Value>
                  <Text style={{ color: theme.colors.muted, fontWeight: '800', marginTop: 6 }}>
                    {item.requested_in_time || '-'} to {item.requested_out_time || '-'} - {item.reason || 'No reason'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity onPress={() => actionCorrection(item.id, 'approve')} style={{ flex: 1, backgroundColor: theme.colors.success, padding: 12, borderRadius: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '900' }}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => actionCorrection(item.id, 'reject')} style={{ flex: 1, backgroundColor: theme.colors.danger, padding: 12, borderRadius: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '900' }}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              )) : <EmptyState text="No attendance corrections pending." />}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
