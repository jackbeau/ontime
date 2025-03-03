import { useEffect, useState } from 'react';
import { useViewportSize } from '@mantine/hooks';
import { CustomFields, OntimeEvent, ProjectData, Runtime, Settings, ViewSettings } from 'ontime-types';
import { millisToString, removeLeadingZero } from 'ontime-utils';

import MultiPartProgressBar from '../../common/components/multi-part-progress-bar/MultiPartProgressBar';
import ProgressBar from '../../common/components/progress-bar/ProgressBar';
import Empty from '../../common/components/state/Empty';
import TitleCard from '../../common/components/title-card/TitleCard';
import ViewLogo from '../../common/components/view-logo/ViewLogo';
import ViewParamsEditor from '../../common/components/view-params-editor/ViewParamsEditor';
import { useWindowTitle } from '../../common/hooks/useWindowTitle';
import { ViewExtendedTimer } from '../../common/models/TimeManager.type';
import { cx, timerPlaceholderMin } from '../../common/utils/styleUtils';
import { formatTime, getDefaultFormat } from '../../common/utils/time';
import SuperscriptTime from '../../features/viewers/common/superscript-time/SuperscriptTime';
import { useTranslation } from '../../translation/TranslationProvider';
import ScheduleExport from '../common/schedule/ScheduleExport';
import { getTotalTime } from '../timer/timer.utils';

import { getRelayOptions, useRelayOptions } from './relay.options';
import { getCardData, getIsPendingStart, getShowProgressBar, isOvertime } from './relay.utils';

import './Relay.scss';

interface RelayProps {
  backstageEvents: OntimeEvent[];
  customFields: CustomFields;
  eventNow: OntimeEvent | null;
  publicEventNow: OntimeEvent | null;
  eventNext: OntimeEvent | null;
  publicEventNext: OntimeEvent | null;
  general: ProjectData;
  isMirrored: boolean;
  time: ViewExtendedTimer;
  runtime: Runtime;
  selectedId: string | null;
  settings: Settings | undefined;
  viewSettings: ViewSettings;
}

export default function Relay(props: RelayProps) {
  const {
    backstageEvents,
    customFields,
    eventNext,
    publicEventNow,
    eventNow,
    publicEventNext,
    general,
    time,
    isMirrored,
    runtime,
    selectedId,
    settings,
    viewSettings,
  } = props;

  const { getLocalizedString } = useTranslation();
  const { secondarySource, hidePrivate, hideNext, useMultipartProgressBar, iframeUrl, hideEventDetails, disableBlink } =
    useRelayOptions();
  const [blinkClass, setBlinkClass] = useState(false);
  const { height: screenHeight } = useViewportSize();

  useWindowTitle('Relay');

  // blink on change
  useEffect(() => {
    setBlinkClass(false);

    const timer = setTimeout(() => {
      setBlinkClass(true);
    }, 10);

    return () => clearTimeout(timer);
  }, [selectedId]);

  // gather card data
  const hasEvents = backstageEvents.length > 0;
  const { showNow, nowMain, nowSecondary, showNext, nextMain, nextSecondary } = getCardData(
    hidePrivate ? publicEventNow : eventNow,
    hidePrivate ? publicEventNext : eventNext,
    'title',
    secondarySource,
    time.playback,
  );
  const hideCurrentPrivateEvent = hidePrivate && eventNow && !eventNow.isPublic;

  // gather timer data
  const clock = formatTime(time.clock);
  const isPendingStart = getIsPendingStart(time.playback, time.phase);
  const startedAt = isPendingStart ? formatTime(time.secondaryTimer) : formatTime(time.startedAt);
  const scheduledStart =
    hasEvents && showNow ? '' : formatTime(runtime.plannedStart, { format12: 'hh:mm a', format24: 'HH:mm' });
  const scheduledEnd =
    hasEvents && showNow ? '' : formatTime(runtime.plannedEnd, { format12: 'hh:mm a', format24: 'HH:mm' });

  let displayTimer = millisToString(time.current, { fallback: timerPlaceholderMin });
  displayTimer = removeLeadingZero(displayTimer);

  // gather presentation styles
  const showProgress = getShowProgressBar(time.playback);
  const showSchedule = hasEvents && screenHeight > 420; // in vertical screens we may not have space

  // gather timer data
  const totalTime = getTotalTime(time.duration, time.addedTime);

  // gather option data
  const defaultFormat = getDefaultFormat(settings?.timeFormat);
  const relayOptions = getRelayOptions(defaultFormat, customFields);

  return (
    <div className={`relay ${isMirrored ? 'mirror' : ''}`} data-testid='relay-view'>
      <ViewParamsEditor viewOptions={relayOptions} />
      <div className='project-header'>
        {general?.projectLogo ? <ViewLogo name={general.projectLogo} className='logo' /> : <div className='logo' />}
        <div className='title'>{general.title}</div>
        <div className='clock-container'>
          <div className='label'>{getLocalizedString('common.time_now')}</div>
          <SuperscriptTime time={clock} className='time' />
        </div>
      </div>

      <div className='iframe-placeholder'>
        {iframeUrl && (
          <iframe
            src={iframeUrl}
            width='100%'
            height='100%'
            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
            allowFullScreen
            title='Embedded content'
            loading='lazy'
          />
        )}
      </div>
      {showProgress &&
        (useMultipartProgressBar ? (
          <MultiPartProgressBar
            className='progress-container'
            now={hideCurrentPrivateEvent ? 1 : time.current}
            complete={hideCurrentPrivateEvent ? null : totalTime}
            normalColor={viewSettings.normalColor}
            warning={eventNow?.timeWarning}
            warningColor={viewSettings.warningColor}
            danger={hidePrivate ? publicEventNow?.timeDanger : eventNow?.timeDanger}
            dangerColor={viewSettings.dangerColor}
            hideOvertime={false}
          />
        ) : (
          <ProgressBar
            className='progress-container'
            current={hideCurrentPrivateEvent ? null : time.current}
            duration={hideCurrentPrivateEvent ? null : time.duration}
          />
        ))}
      {!hasEvents && <Empty text={getLocalizedString('common.no_data')} className='empty-container' />}

      <div className='card-container'>
        {showNow && (
          <div className={cx(['event', 'now', !disableBlink && blinkClass && 'blink'])}>
            <TitleCard label='now' title={nowMain} secondary={nowSecondary} />
            {hideEventDetails ? (
              <div></div>
            ) : (
              <div className='timer-group'>
                <div className='time-entry'>
                  <div className={cx(['time-entry__label', isPendingStart && 'time-entry--pending'])}>
                    {isPendingStart ? getLocalizedString('countdown.waiting') : getLocalizedString('common.started_at')}
                  </div>
                  <SuperscriptTime time={startedAt} className='time-entry__value' />
                </div>
                <div className='timer-gap' />
                <div className='time-entry'>
                  <div className='time-entry__label'>{getLocalizedString('common.expected_finish')}</div>
                  {isOvertime(time.current) ? (
                    <div className='time-entry__value'>{getLocalizedString('countdown.overtime')}</div>
                  ) : (
                    <SuperscriptTime time={formatTime(time.expectedFinish)} className='time-entry__value' />
                  )}
                </div>
                <div className='timer-gap' />
                <div className='time-entry'>
                  <div className='time-entry__label'>{getLocalizedString('common.stage_timer')}</div>
                  <div className='time-entry__value'>{displayTimer}</div>
                </div>
              </div>
            )}
          </div>
        )}
        {!showNow && hasEvents && (
          <div className='event'>
            <div className='title-card__placeholder'>{getLocalizedString('countdown.waiting')}</div>
            <div className='timer-group'>
              <div className='time-entry'>
                <div className={cx(['time-entry__label', isPendingStart && 'time-entry--pending'])}>
                  {getLocalizedString('common.scheduled_start')}
                </div>
                <SuperscriptTime time={scheduledStart} className='time-entry__value' />
              </div>
              <div className='timer-gap' />
              <div className='time-entry'>
                <div className='time-entry__label'>{getLocalizedString('common.scheduled_end')}</div>
                <SuperscriptTime time={scheduledEnd} className='time-entry__value' />
              </div>
            </div>
          </div>
        )}

        {!hideNext && showNext && hasEvents && (
          <div className={cx(['event', 'now', !disableBlink && blinkClass && 'blink'])}>
            <TitleCard label='next' title={nextMain} secondary={nextSecondary} />
          </div>
        )}
      </div>

      {showSchedule && (
        <div className='sidebar-container'>
          <ScheduleExport selectedId={selectedId} isBackstage hidePrivate={hidePrivate} />
        </div>
      )}
    </div>
  );
}
