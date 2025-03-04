import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CustomFields, OntimeEvent } from 'ontime-types';

import {
  getTimeOption,
  makeOptionsFromCustomFields,
  OptionTitle,
} from '../../common/components/view-params-editor/constants';
import { ViewOption } from '../../common/components/view-params-editor/types';
import { isStringBoolean } from '../../features/viewers/common/viewUtils';
import { scheduleOptions } from '../common/schedule/schedule.options';

export const getBackstageOptions = (timeFormat: string, customFields: CustomFields): ViewOption[] => {
  const secondaryOptions = makeOptionsFromCustomFields(customFields, { note: 'Note' });

  return [
    { title: OptionTitle.ClockOptions, collapsible: true, options: [getTimeOption(timeFormat)] },
    {
      title: OptionTitle.DataSources,
      collapsible: true,
      options: [
        {
          id: 'secondary-src',
          title: 'Event secondary text',
          description: 'Select the data source for auxiliary text shown in now and next cards',
          type: 'option',
          values: secondaryOptions,
          defaultValue: '',
        },
        {
          id: 'hide-private',
          title: 'Hide private events',
          description: 'Whether private events should be hidden',
          type: 'boolean',
          defaultValue: false,
        },
        {
          id: 'hide-next',
          title: 'Hide next event',
          description: 'Whether to hide the next event card',
          type: 'boolean',
          defaultValue: false,
        },
        {
          id: 'useMultipartProgressBar',
          title: 'Use multi-part progress bar',
          description: 'Use the multi-part progress bar with warning and danger indicators',
          type: 'boolean',
          defaultValue: false,
        },
      ],
    },
    scheduleOptions,
  ];
};

type BackstageOptions = {
  secondarySource: keyof OntimeEvent | null;
  hidePrivate: boolean;
  hideNext: boolean;
  useMultipartProgressBar: boolean;
};

/**
 * Utility extract the view options from URL Params
 * the names and fallback are manually matched with timerOptions
 */
function getOptionsFromParams(searchParams: URLSearchParams): BackstageOptions {
  // we manually make an object that matches the key above
  return {
    secondarySource: searchParams.get('secondary-src') as keyof OntimeEvent | null,
    hidePrivate: isStringBoolean(searchParams.get('hide-private')),
    hideNext: isStringBoolean(searchParams.get('hide-next')),
    useMultipartProgressBar: isStringBoolean(searchParams.get('useMultipartProgressBar')),
  };
}

/**
 * Hook exposes the backstage view options
 */
export function useBackstageOptions(): BackstageOptions {
  const [searchParams] = useSearchParams();
  const options = useMemo(() => getOptionsFromParams(searchParams), [searchParams]);
  return options;
}
