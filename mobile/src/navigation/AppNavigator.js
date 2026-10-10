import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import EmployeeDashboard from '../screens/EmployeeDashboard';
import FaceVerification from '../screens/FaceVerification';
import LocationVerification from '../screens/LocationVerification';
import AttendanceSuccess from '../screens/AttendanceSuccess';
import AttendanceHistory from '../screens/AttendanceHistory';
import AdminDashboard from '../screens/AdminDashboard';
import EmployeeManagement from '../screens/EmployeeManagement';
import AttendanceReport from '../screens/AttendanceReport';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="EmployeeDashboard" component={EmployeeDashboard} />
        <Stack.Screen name="FaceVerification" component={FaceVerification} />
        <Stack.Screen name="LocationVerification" component={LocationVerification} />
        <Stack.Screen name="AttendanceSuccess" component={AttendanceSuccess} />
        <Stack.Screen name="AttendanceHistory" component={AttendanceHistory} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="EmployeeManagement" component={EmployeeManagement} />
        <Stack.Screen name="AttendanceReport" component={AttendanceReport} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
