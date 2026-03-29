import React, { useState } from 'react';
import { Joyride, STATUS } from 'react-joyride';

const GuidedTour = ({ run, setRun }) => {
  const [steps] = useState([
    {
      target: 'body',
      content: 'Welcome to FraudShield! Let us take a quick tour of the forensic tools available to you.',
      placement: 'center',
    },
    {
      target: '.text-3xl',
      content: 'This is the Live Dashboard, where you can monitor real-time transaction flows.',
    },
    {
      target: '.tour-load-button',
      content: 'Click here to ingest real-world data from the Demat fraud case (train_final.csv).',
    },
    {
      target: '.overflow-hidden table',
      content: 'This table shows every transaction processed. You can see the risk scores and reasoning for each one.',
    },
    {
      target: '.tour-graph-button',
      content: 'Click the Graph button on any transaction to open the deep-dive Investigation Graph for that account.',
    },
    {
      target: '.tour-refresh-button',
      content: 'Use this to manually pull the latest data from the forensic database.',
    },
  ]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#3b82f6', // blue-500
          backgroundColor: '#1f2937', // gray-800
          textColor: '#f3f4f6', // gray-100
          arrowColor: '#1f2937',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          borderRadius: '8px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          fontSize: '12px',
        },
        buttonBack: {
          marginRight: '10px',
          fontSize: '12px',
          color: '#9ca3af', // gray-400
        },
        buttonSkip: {
            fontSize: '12px',
            color: '#9ca3af',
        }
      }}
    />
  );
};

export default GuidedTour;
