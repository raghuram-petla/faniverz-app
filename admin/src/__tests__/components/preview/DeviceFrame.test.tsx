import { render, screen } from '@testing-library/react';
import { DeviceFrame } from '@/components/preview/DeviceFrame';
import { DEVICES } from '@shared/constants';

describe('DeviceFrame', () => {
  const device = DEVICES[1]; // iPhone 15

  it('renders children', () => {
    render(
      <DeviceFrame device={device}>
        <div data-testid="child">Hello</div>
      </DeviceFrame>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('displays device name and dimensions', () => {
    render(
      <DeviceFrame device={device}>
        <div />
      </DeviceFrame>,
    );
    expect(
      screen.getByText(`${device.name} — ${device.width}×${device.height}`),
    ).toBeInTheDocument();
  });

  it('applies correct scale transform', () => {
    const maxWidth = 320;
    const expectedScale = maxWidth / device.width;
    const { container } = render(
      <DeviceFrame device={device} maxWidth={maxWidth}>
        <div />
      </DeviceFrame>,
    );
    const scaledDiv = container.querySelector(`[style*="scale(${expectedScale})"]`);
    expect(scaledDiv).toBeTruthy();
  });

  it('supports custom maxWidth', () => {
    const maxWidth = 250;
    const { container } = render(
      <DeviceFrame device={device} maxWidth={maxWidth}>
        <div />
      </DeviceFrame>,
    );
    const frame = container.querySelector(`[style*="width: ${maxWidth}px"]`);
    expect(frame).toBeTruthy();
  });
});
