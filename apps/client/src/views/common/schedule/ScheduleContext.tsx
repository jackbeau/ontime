import {
  createContext,
  PropsWithChildren,
  RefObject,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { isOntimeEvent, OntimeEvent, OntimeRundownEntry } from 'ontime-types';

import { usePartialRundown } from '../../../common/hooks-query/useRundown';

import { useScheduleOptions } from './schedule.options';

interface ScheduleContextState {
  events: OntimeEvent[];
  selectedEventId: string | null;
  numPages: number;
  visiblePage: number;
  isBackstage: boolean;
  containerRef: RefObject<HTMLUListElement>;
}

const ScheduleContext = createContext<ScheduleContextState | undefined>(undefined);

interface ScheduleProviderProps {
  selectedEventId: string | null;
  isBackstage?: boolean;
  hidePrivate?: boolean;
}

export const ScheduleProvider = ({
  children,
  selectedEventId,
  isBackstage = false,
  hidePrivate = false,
}: PropsWithChildren<ScheduleProviderProps>) => {
  const { cycleInterval, stopCycle, disablePages } = useScheduleOptions();
  const { data: events } = usePartialRundown((event: OntimeRundownEntry) => {
    return isOntimeEvent(event);
  }) as { data: OntimeEvent[] };

  const [firstIndex, setFirstIndex] = useState(-1);
  const [numPages, setNumPages] = useState(0);
  const [visiblePage, setVisiblePage] = useState(0);

  const lastIndex = useRef(-1);
  const paginator = useRef<NodeJS.Timeout>();

  const containerRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    // If pagination is disabled, create a scrollable list
    if (disablePages) {
      const children = Array.from(containerRef.current.children) as HTMLElement[];
      if (children.length === 0) return;

      for (let i = 0; i < children.length; i++) {
        const element = children[i];
        element.style.position = 'relative';
        element.style.top = '0';
      }

      // Set container to be scrollable
      if (containerRef.current) {
        containerRef.current.style.height = 'auto';
        containerRef.current.style.overflow = 'auto';
        containerRef.current.style.position = 'relative';
      }

      // Set single page for context
      setNumPages(1);
      setVisiblePage(1);
      return;
    }

    const children = Array.from(containerRef.current.children) as HTMLElement[];
    if (children.length === 0) {
      return;
    }

    if (containerRef.current) {
      containerRef.current.style.height = '';
      containerRef.current.style.overflow = 'hidden';
      containerRef.current.style.position = 'relative';
    }

    const containerHeight = containerRef.current.clientHeight;
    let currentPageHeight = 0; // used to check when we need to paginate
    let currentPage = 1;
    let numPages = 1;
    let lastVisibleIndex = -1; // keep track of last index on screen
    let isShowingElements = false;

    for (let i = 0; i < children.length; i++) {
      const currentElementHeight = children[i].clientHeight;

      // Ensure elements have absolute positioning for pagination mode
      children[i].style.position = 'absolute';

      // can we fit this element in the current page?
      const isNextPage = currentPageHeight + currentElementHeight > containerHeight;
      if (isNextPage) {
        currentPageHeight = 0;
        numPages += 1;
      }

      // we hide elements that are before and after the first element to show
      if (i < firstIndex) {
        hideElement(children[i]);
      } else if (lastVisibleIndex === -1) {
        isShowingElements = true;
        currentPage = numPages;
      } else if (isNextPage) {
        isShowingElements = false;
      }

      if (!isShowingElements) {
        hideElement(children[i]);
      } else {
        lastVisibleIndex = i;
        showElement(children[i], currentPageHeight);
      }

      currentPageHeight += currentElementHeight;
    }

    setVisiblePage(currentPage);
    setNumPages(numPages);
    lastIndex.current = lastVisibleIndex;

    function showElement(element: HTMLElement, yPosition: number) {
      element.style.top = `${yPosition}px`;
    }

    function hideElement(element: HTMLElement) {
      element.style.top = `${-1000}px`;
    }
  }, [firstIndex, events, disablePages]);

  // schedule cycling through events (only for pagination mode)
  useEffect(() => {
    // Clear any existing interval
    if (paginator.current) {
      clearInterval(paginator.current);
      paginator.current = undefined;
    }

    // Don't set up cycling if pagination is disabled or cycling is stopped
    if (disablePages || stopCycle) {
      setVisiblePage(1);
      setFirstIndex(0);
      return;
    }

    const interval = setInterval(() => {
      // ensure we cycle back to the first event
      if (visiblePage === numPages) {
        setFirstIndex(0);
      } else {
        setFirstIndex(lastIndex.current + 1);
      }
    }, cycleInterval * 1000);
    paginator.current = interval;

    return () => {
      if (paginator.current) {
        clearInterval(paginator.current);
      }
    };
  }, [cycleInterval, numPages, stopCycle, visiblePage, disablePages]);

  let selectedEventIndex = events.findIndex((event) => event.id === selectedEventId);

  // we want to show the event after the current
  const viewEvents = events.toSpliced(0, selectedEventIndex + 1).filter((e) => !hidePrivate || e.isPublic);
  selectedEventIndex = 0;

  return (
    <ScheduleContext.Provider
      value={{
        events: viewEvents as OntimeEvent[],
        selectedEventId,
        numPages,
        visiblePage,
        isBackstage,
        containerRef,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule() can only be used inside a ScheduleContext');
  }
  return context;
};
