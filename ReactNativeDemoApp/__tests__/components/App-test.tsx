/**
 * @format
 */

import 'react-native';
import React from 'react';
import { App } from '../../App';

// Note: test renderer must be required after react-native.
// tslint:disable-next-line: no-implicit-dependencies
import renderer from 'react-test-renderer';

it('renders correctly', () => {
  renderer.create(<App />);
});
