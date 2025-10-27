import React from 'react';
import { Text, TextStyle } from 'react-native';

export function HelloWave() {
  const style: TextStyle = {
    fontSize: 28,
    lineHeight: 32,
    marginTop: -6,
  };

  return <Text style={style}>👋</Text>;
}
