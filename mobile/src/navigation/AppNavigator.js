import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import ChangePinScreen from '../screens/ChangePinScreen';
import EmployeeDashboard from '../screens/EmployeeDashboard';
import FaceVerification from '../screens/FaceVerification';
import FaceEnroll from '../screens/FaceEnroll';
import LocationVerification from '../screens/LocationVerification';
import AttendanceSuccess from '../screens/AttendanceSuccess';
import AttendanceHistory from '../screens/AttendanceHistory';
import AdminDashboard from '../screens/AdminDashboard';
import EmployeeManagement from '../screens/EmployeeManagement';
import AttendanceReport from '../screens/AttendanceReport';
import SettingsScreen from '../screens/SettingsScreen';
import LeaveScreen from '../screens/LeaveScreen';
import LeaveApprovals from '../screens/LeaveApprovals';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <SplashScreen />;

  const isAdmin = user && (user.role === 'admin' || user.role === 'hr');

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.must_change_pin ? (
          <Stack.Screen name="ChangePin" component={ChangePinScreen} />
        ) : isAdmin ? (
          <>
            <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
            <Stack.Screen name="EmployeeManagement" component={EmployeeManagement} />
            <Stack.Screen name="AttendanceReport" component={AttendanceReport} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Leave" component={LeaveScreen} />
            <Stack.Screen name="LeaveApprovals" component={LeaveApprovals} />
            <Stack.Screen name="ChangePin" component={ChangePinScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="EmployeeDashboard" component={EmployeeDashboard} />
            <Stack.Screen
              name="FaceEnroll"
              component={FaceEnroll}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen name="FaceVerification" component={FaceVerification} />
            <Stack.Screen name="LocationVerification" component={LocationVerification} />
            <Stack.Screen name="AttendanceSuccess" component={AttendanceSuccess} />
            <Stack.Screen name="AttendanceHistory" component={AttendanceHistory} />
            <Stack.Screen name="Leave" component={LeaveScreen} />
            <Stack.Screen name="LeaveApprovals" component={LeaveApprovals} />
            <Stack.Screen name="ChangePin" component={ChangePinScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}