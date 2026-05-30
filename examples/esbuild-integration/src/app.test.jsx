import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { $ } from 'defuss';
import { App } from './app.jsx';

// Test container setup
let container;

beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
});

afterEach(() => {
    container.remove();
});

describe('App Component', () => {
    it('should render the App component', async () => {
        await $(container).update(<App />);

        expect(container.querySelector('h1')?.textContent).toBe('App');
    });

    it('should render welcome message', async () => {
        await $(container).update(<App />);

        expect(container.querySelector('p')?.textContent).toBe('Welcome to the defuss esbuild example!');
    });

    it('should have app-container class', async () => {
        await $(container).update(<App />);

        expect(container.querySelector('.app-container')).not.toBeNull();
    });
});

describe('Defuss Basics', () => {
    it('should select elements with $', () => {
        // Create an element with id 'target'
        const target = document.createElement('div');
        target.id = 'target';
        container.appendChild(target);

        // Use $ selector on the container context
        const el = container.querySelector('#target');
        expect(el).toBeInstanceOf(HTMLElement);
        expect(el?.id).toBe('target');
    });

    it('should render JSX elements', async () => {
        const element = <span class="hello">Hello World</span>;
        await $(container).update(element);

        expect(container.querySelector('.hello')?.textContent).toBe('Hello World');
    });

    it('should render nested JSX', async () => {
        const Nested = () => (
            <div class="parent">
                <span class="child">Child content</span>
            </div>
        );
        await $(container).update(<Nested />);

        expect(container.querySelector('.parent .child')?.textContent).toBe('Child content');
    });

    it('should render conditional elements', async () => {
        const showFirst = true;
        const showSecond = false;

        const Conditional = () => (
            <div>
                {showFirst && <span class="first">First</span>}
                {showSecond && <span class="second">Second</span>}
            </div>
        );

        await $(container).update(<Conditional />);

        expect(container.querySelector('.first')?.textContent).toBe('First');
        expect(container.querySelector('.second')).toBeNull();
    });

    it('should render lists with map', async () => {
        const items = ['Apple', 'Banana', 'Cherry'];

        const List = () => (
            <ul>
                {items.map((item, index) => (
                    <li key={index} class="list-item">{item}</li>
                ))}
            </ul>
        );

        await $(container).update(<List />);

        const listItems = container.querySelectorAll('.list-item');
        expect(listItems.length).toBe(3);
        expect(listItems[0]?.textContent).toBe('Apple');
        expect(listItems[1]?.textContent).toBe('Banana');
        expect(listItems[2]?.textContent).toBe('Cherry');
    });
});
