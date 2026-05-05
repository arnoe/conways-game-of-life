import { fireEvent, render, screen } from '@testing-library/react';
import { GridSizeForm } from './GridSizeForm';

describe('GridSizeForm — render', () => {
  it('renders width and height inputs with default values 30 and 30', () => {
    render(<GridSizeForm width={30} height={30} onResize={() => undefined} />);
    expect(screen.getByLabelText(/width/i)).toHaveValue(30);
    expect(screen.getByLabelText(/height/i)).toHaveValue(30);
  });

  it('renders an Apply button with an accessible name', () => {
    render(<GridSizeForm width={30} height={30} onResize={() => undefined} />);
    expect(
      screen.getByRole('button', { name: /apply/i }),
    ).toBeInTheDocument();
  });

  it('inputs have visible labels (associated via htmlFor / id)', () => {
    render(<GridSizeForm width={30} height={30} onResize={() => undefined} />);
    expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
  });
});

describe('GridSizeForm — submit, valid input', () => {
  it('AC-3: submitting valid 50×40 calls onResize({ width: 50, height: 40 })', () => {
    const onResize = jest.fn();
    render(<GridSizeForm width={30} height={30} onResize={onResize} />);
    const widthInput = screen.getByLabelText(/width/i);
    const heightInput = screen.getByLabelText(/height/i);
    fireEvent.change(widthInput, { target: { value: '50' } });
    fireEvent.change(heightInput, { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledWith({ width: 50, height: 40 });
  });

  it('AC-3: submitting via Enter key (form submit) calls onResize', () => {
    const onResize = jest.fn();
    const { container } = render(
      <GridSizeForm width={30} height={30} onResize={onResize} />,
    );
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    if (form === null) return;
    fireEvent.submit(form);
    expect(onResize).toHaveBeenCalledWith({ width: 30, height: 30 });
  });
});

describe('GridSizeForm — submit, invalid input', () => {
  it('AC-4: submitting width=0 shows an inline error and does NOT call onResize', () => {
    const onResize = jest.fn();
    render(<GridSizeForm width={30} height={30} onResize={onResize} />);
    fireEvent.change(screen.getByLabelText(/width/i), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(onResize).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('AC-4: submitting empty input shows error and does NOT call onResize', () => {
    const onResize = jest.fn();
    render(<GridSizeForm width={30} height={30} onResize={onResize} />);
    fireEvent.change(screen.getByLabelText(/width/i), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(onResize).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('AC-4: error message has role="alert" so screen readers announce it', () => {
    render(<GridSizeForm width={30} height={30} onResize={() => undefined} />);
    fireEvent.change(screen.getByLabelText(/width/i), {
      target: { value: '999' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('GridSizeForm — accessibility baseline', () => {
  it('the form element wraps inputs and submit button (semantic <form>)', () => {
    const { container } = render(
      <GridSizeForm width={30} height={30} onResize={() => undefined} />,
    );
    expect(container.querySelector('form')).not.toBeNull();
  });
});
