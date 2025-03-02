import { memo } from 'react';
import { MaybeString } from 'ontime-types';

import Schedule from './Schedule';
import { useScheduleOptions } from './schedule.options';
import { ScheduleProvider } from './ScheduleContext';
import ScheduleNav from './ScheduleNav';

interface ScheduleExportProps {
  selectedId: MaybeString;
  isBackstage?: boolean;
  hidePrivate?: boolean;
}

export default memo(ScheduleExport);
function ScheduleExport(props: ScheduleExportProps) {
  const { selectedId, isBackstage, hidePrivate } = props;
  const { disablePages } = useScheduleOptions();

  return (
    <ScheduleProvider selectedEventId={selectedId} isBackstage={isBackstage} hidePrivate={hidePrivate}>
      {!disablePages && <ScheduleNav className='schedule-nav-container' />}
      <Schedule isProduction={isBackstage} className='schedule-container' />
    </ScheduleProvider>
  );
}
