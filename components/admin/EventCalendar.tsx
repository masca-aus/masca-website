'use client';

import ReactDatePickerImport from 'react-datepicker';

// Payload uses the same interop for this shared calendar dependency.
const EventCalendar = ('default' in ReactDatePickerImport ? ReactDatePickerImport.default : ReactDatePickerImport) as typeof ReactDatePickerImport;
export default EventCalendar;
