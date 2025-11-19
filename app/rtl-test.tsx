import React from 'react';
import { View, Text } from 'react-native';

// Minimal RTL test route - provides a default export so Expo Router treats this file as a valid route.
export default function RtlTestRoute() {
  return (
    React.createElement(View, { style: { padding: 12 } }, React.createElement(Text, null, 'RTL Test'))
  );
}

