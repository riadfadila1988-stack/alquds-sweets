import React from 'react';
import { View } from 'react-native';

// No-op route component to satisfy Expo/Next-style app router.
export default function TypesRoute() {
  return React.createElement(View, { style: { width: 0, height: 0 } });
}

