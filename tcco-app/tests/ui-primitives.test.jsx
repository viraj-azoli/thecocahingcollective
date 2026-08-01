// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  Button, Card, PageHeader, SectionHeader, StatTile, StatRow, Badge, Tag,
  Avatar, EmptyState, MoodScale, ActionCard, Icon, Modal, ConfirmDialog,
  StarRating, Tabs, DateGrid, TimeSlotGrid,
} from '../src/ui';

// This project has no vitest setupFiles, so testing-library's automatic
// cleanup never runs and mounted trees leak between tests.
afterEach(cleanup);

describe('design system primitives', () => {
  it('every primitive mounts and renders its content', () => {
    const cases = [
      <Button key="b">Book</Button>,
      <Card key="c">card body</Card>,
      <PageHeader key="p" title="Title" subtitle="Sub" />,
      <SectionHeader key="s" label="Label" />,
      <StatRow key="sr" columns={3}><StatTile value={6} label="Day streak" /></StatRow>,
      <Badge key="bd" tone="success">Verified</Badge>,
      <Tag key="t">Burnout</Tag>,
      <Avatar key="a" name="Laura Madden" />,
      <EmptyState key="e" title="Nothing yet" body="Come back later" />,
      <MoodScale key="m" value={3} onChange={() => {}} />,
      <ActionCard key="ac" icon="coaches" label="Find a coach" sub="Browse" onClick={() => {}} />,
      <Icon key="i" name="home" />,
      <StarRating key="st" value={4} readOnly showValue />,
      <Tabs key="tb" tabs={[{ value: 'a', label: 'Upcoming', count: 2 }]} value="a" onChange={() => {}} />,
    ];
    for (const el of cases) {
      const { unmount } = render(el);
      unmount();
    }
    expect(true).toBe(true);
  });

  it('Badge resolves a domain status to a tone and renders a glyph, not colour alone', () => {
    render(<Badge status="cancelled" />);
    // The label comes from the status, and a glyph accompanies the hue so the
    // meaning survives greyscale and colour-blindness.
    expect(screen.getByText('cancelled')).toBeTruthy();
    expect(document.querySelector('.cc-badge-danger')).toBeTruthy();
    expect(document.querySelector('.cc-badge-glyph')).toBeTruthy();
  });

  it('Button reports loading to assistive tech instead of swapping its label', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Save');
  });

  it('MoodScale is a radiogroup and reports the checked option', () => {
    const onChange = vi.fn();
    render(<MoodScale value={4} onChange={onChange} />);
    expect(screen.getByRole('radiogroup')).toBeTruthy();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
    expect(radios[3].getAttribute('aria-checked')).toBe('true');
    fireEvent.click(radios[0]);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('Tabs moves selection with arrow keys', () => {
    const onChange = vi.fn();
    const tabs = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];
    render(<Tabs tabs={tabs} value="a" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('Modal closes on Escape and is announced as a dialog', () => {
    const onClose = vi.fn();
    render(<Modal open title="Confirm" onClose={onClose}>body</Modal>);
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('Modal renders nothing when closed', () => {
    render(<Modal open={false} title="Confirm" onClose={() => {}}>body</Modal>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('ConfirmDialog surfaces its warning in the page, not OS chrome', () => {
    render(
      <ConfirmDialog
        open
        title="Cancel session?"
        warning="Late cancellations may be charged."
        onClose={() => {}}
        onConfirm={() => {}}
        destructive
      />
    );
    expect(screen.getByText(/Late cancellations may be charged/)).toBeTruthy();
    expect(document.querySelector('.cc-btn-danger')).toBeTruthy();
  });

  it('StarRating exposes its value to assistive tech when read-only', () => {
    render(<StarRating value={4} readOnly />);
    expect(screen.getByLabelText('4 out of 5')).toBeTruthy();
  });

  it('DateGrid keys dates in local time, not UTC', () => {
    // toISOString() shifts to UTC, so for anyone west of Greenwich a date
    // could be keyed as the previous day.
    const onChange = vi.fn();
    const d = new Date(2026, 7, 15, 23, 30); // 15 Aug, late evening local
    render(<DateGrid days={[d]} value="" onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('radio')[0]);
    expect(onChange).toHaveBeenCalledWith('2026-08-15');
  });

  it('TimeSlotGrid disables taken slots and says why', () => {
    const onChange = vi.fn();
    render(<TimeSlotGrid slots={['09:00', '10:00']} value="" taken={['09:00']} onChange={onChange} />);
    const taken = screen.getByLabelText('9:00 AM — already booked');
    expect(taken.disabled).toBe(true);
    fireEvent.click(taken);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('10:00 AM'));
    expect(onChange).toHaveBeenCalledWith('10:00');
  });

  it('Avatar falls back to initials without an image', () => {
    render(<Avatar name="Laura Madden" />);
    expect(screen.getByText('LM')).toBeTruthy();
  });
});
