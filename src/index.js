import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import * as serviceWorker from './serviceWorker';
import JXGBoard from 'jsxgraph-react-js';
import * as dspStuff from 'dsp.js';
import MathJax from 'react-mathjax2'

var Fili = require('fili');

function getWindow (buffer) {
    var length = buffer.length;
    for (var i = 0; i < length; i++) {
        buffer[i] *= Hamming(length, i);
    }
    return buffer;
};

function Hamming(length, index) {
    return 0.54 - 0.46 * Math.cos(Math.PI * 2 * index / (length - 1));
};

/*
 * Returns an array of the result of 3 noisy sine function
 *
 * @param array the array of x that is an input to the sine function
 * @param freq the three frequencies that make the sine function noisy
 * @param amp the three amplitudes that make the sine function noisy.
 * */
function makeSine(array, freq1, amp1, freq2, amp2, freq3, amp3) {
    var A = [];

    for (var i = 0; i < array.length; i++) {
        A[i] = Math.sin(Math.PI * 2 * array[i] * freq1) * amp1 + Math.sin(Math.PI * 2 * array[i] * freq2) * amp2 + Math.sin(Math.PI * 2 * array[i] * freq3) * amp3;
    }
    return A;
}
/*
 * Returns the x array for the sine function
 *
 * @param start the beginning number at index 0 of the array
 * @param buffersize the size of the array which should be a power of 2
 * @param step the increment between each increase fromstart to buffersize
 * */
function populate(start, bufferSize, step) {
    var A = [];
    A[0] = start;
    step = step || 1;
    for (var i = 0; i < bufferSize; i++) {
        A[A.length] = start += step;
    }

    return A;
}

/*
 * Returns the x array for the fft function
 *
 * @param sampleFreq idk what this is. Leave at 200000, or the current value of fs.
 * @param pow The current 2nd power or the length of the x array.
 * */
function createXfft(sampleFreq, pow) {
    var A = Array.from(Array(Math.ceil(pow / 2)).keys());
    for (var i = 0; i < A.length; i++) {
        A[i] = sampleFreq * A[i] / pow;
    }
    return A;
}

/*
 * Returns a normalized array
 *
 * @param the array to normalize
 * */
function normalizeyfft(array) {
    var max = Math.max.apply(Math, array);
    console.error(max);

    var A = [];
    for (var i = 0; i < array.length; i++) {
        A[i] = array[i] / max;
    }

    return A;
}

var currentCurve;

let curveLogic = (brd) => {
    document.getElementById("amp1").addEventListener('change', onChange);
    document.getElementById("amp2").addEventListener('change', onChange);
    document.getElementById("amp3").addEventListener('change', onChange);
    document.getElementById("freq1").addEventListener('change', onChange);
    document.getElementById("freq2").addEventListener('change', onChange);
    document.getElementById("freq3").addEventListener('change', onChange);
    document.getElementById("pow").addEventListener('change', onChange);
    document.getElementById("order").addEventListener('change', onChange);
    document.getElementById("cutoff").addEventListener('change', onChange);
    document.getElementById("graphTypeSelection").addEventListener('change', onChange);
    // document.getElementById("windowSelection").addEventListener('change', onChange);

    var amp1 = document.getElementById("amp1").value;
    var amp2 = document.getElementById("amp2").value;
    var amp3 = document.getElementById("amp3").value;
    var freq1 = document.getElementById("freq1").value;
    var freq2 = document.getElementById("freq2").value;
    var freq3 = document.getElementById("freq3").value;
    var pow = document.getElementById("pow").value;

    var fs = 2.2 * Math.max(freq1, freq2, freq3);//The sampling frequence. Greg says it should be set to 2.2 * the max(f1, f2, f3)
    var ts = 1 / fs;//Something I currently don't understand. It's currently not used.
    var bufferSize = Math.pow(2, pow);//Size of the array. Should be a power of 2

    var x = populate(0, bufferSize - 1, ts)

    var y = makeSine(x, freq1, amp1, freq2, amp2, freq3, amp3);

    currentCurve = brd.create('curve', [x, y], { line: 2 });

    brd.setBoundingBox([ts*-10, Math.max(amp1, amp2, amp3) * 1.5, ts*bufferSize + 10*ts, -1 * Math.max(amp1, amp2, amp3) * 1.5]);

    function onChange() {
        brd.removeObject(currentCurve);
        var amp1 = document.getElementById("amp1").value;
        var amp2 = document.getElementById("amp2").value;
        var amp3 = document.getElementById("amp3").value;
        var freq1 = document.getElementById("freq1").value;
        var freq2 = document.getElementById("freq2").value;
        var freq3 = document.getElementById("freq3").value;
        var pow = document.getElementById("pow").value;
        var order = document.getElementById("order").value;
        var cutoff = document.getElementById("cutoff").value;
        var select = document.getElementById("graphTypeSelection").value;

        var fs = 2.2 * Math.max(freq1, freq2, freq3);//The sampling frequence. Greg says it should be set to 2.2 * the max(f1, f2, f3)
        var ts = 1 / fs;//Something I currently don't understand. It's currently not used.
        var bufferSize = Math.pow(2, pow);//Size of the array. Should be a power of 2

        if (select === "Noisy Sin") {
            var x = populate(0, bufferSize - 1, ts);

            var y = makeSine(x, freq1, amp1, freq2, amp2, freq3, amp3);

            brd.setBoundingBox([-0.05 * x[x.length - 1], Math.max(amp1, amp2, amp3) * 3, x[x.length - 1], -1 * Math.max(amp1, amp2, amp3) * 3]);

            currentCurve = brd.create('curve', [x, y], { line: 2 });
            //
            // f.updateCurve();
            brd.update();
        } else if (select === "FFT") {
            var x = populate(0, bufferSize - 1, ts);
            var y = makeSine(x, freq1, amp1, freq2, amp2, freq3, amp3);

            var fft = new dspStuff.FFT(bufferSize, fs); //Creates a new fft object based on dsp.js
            fft.forward(y); //using FFT on array y
            var spectrum = fft.spectrum; //obtaining the result of the FFT
            var normal = normalizeyfft(spectrum);//normalizing the result
            var xfft = createXfft(fs, bufferSize); //creating the x axis.
            var yfft = Array.from(spectrum); //converting from Float64Array to regular array to plot

            currentCurve = brd.create('curve', [xfft, normal], { line: 2 });

            brd.setBoundingBox([-0.05 * xfft[xfft.length - 1], 1, xfft[xfft.length - 1], -0.1]);

            brd.update();
        } else if (select === "Filter") {
            var x = populate(0, bufferSize - 1, ts);

            var y = makeSine(x, freq1, amp1, freq2, amp2, freq3, amp3);

            var firCalculator = new Fili.FirCoeffs();

            var firFilterCoeffs = firCalculator.lowpass({
                order: order, // filter order
                Fs: fs, // sampling frequency
                Fc: cutoff // cutoff frequency
                // forbandpass and bandstop F1 and F2 must be provided instead of Fc
            });

            var firFilter = new Fili.FirFilter(firFilterCoeffs);
            var filY = firFilter.multiStep(y);

            var max = Math.max(...filY);
            brd.setBoundingBox([-0.05 * x[x.length - 1], max, x[x.length - 1], -1 * max]);

            currentCurve = brd.create('curve', [x, filY], { line: 2 });
            //
            // f.updateCurve();
            brd.update();
        } else if (select === "Window") {
            var xSine = populate(0, bufferSize - 1, ts);

            var yWindow = getWindow(xSine);
            var xWindow = populate(0, yWindow.length, 1);

            var max = Math.max(...yWindow);
            brd.setBoundingBox([-.05 * xWindow[xWindow.length - 1], max, xWindow[xWindow.length - 1], -.075 * max]);

            currentCurve = brd.create('curve', [xWindow, yWindow], { line: 2 })
            //
            // f.updateCurve();
            brd.update();
        } else if (select === "FFT Hamming") {
            var xSine = populate(0, bufferSize - 1, ts);

            var yWindow = getWindow(xSine);
            var xWindow = populate(0, yWindow.length, 1);

            var fft = new dspStuff.FFT(bufferSize, fs); //Creates a new fft object based on dsp.js
            fft.forward(yWindow); //using FFT on array y
            var spectrum = fft.spectrum; //obtaining the result of the FFT
            var normal = normalizeyfft(spectrum);//normalizing the result
            var xfft = createXfft(fs, bufferSize - 1); //creating the x axis.
            var yfft = Array.from(spectrum); //converting from Float64Array to regular array to plot
            console.error(yfft);


            currentCurve = brd.create('curve', [xfft, normal], { line: 2 });

            brd.setBoundingBox([-0.05 * xfft[xfft.length - 1], 1, xfft[xfft.length - 1], -0.1]);

            //
            // f.updateCurve();
            brd.update();
        } else if (select === "FFT Filter") {
            var x = populate(0, bufferSize - 1, ts);

            var y = makeSine(x, freq1, amp1, freq2, amp2, freq3, amp3);


            var firCalculator = new Fili.FirCoeffs();

            var firFilterCoeffs = firCalculator.lowpass({
                order: order, // filter order
                Fs: fs, // sampling frequency
                Fc: cutoff // cutoff frequency
                // forbandpass and bandstop F1 and F2 must be provided instead of Fc
            });

            var firFilter = new Fili.FirFilter(firFilterCoeffs);
            var filY = firFilter.multiStep(y);

            var fft = new dspStuff.FFT(bufferSize, fs); //Creates a new fft object based on dsp.js
            fft.forward(filY); //using FFT on array y
            var spectrum = fft.spectrum; //obtaining the result of the FFT
            var normal = normalizeyfft(spectrum);//normalizing the result
            var xfft = createXfft(fs, bufferSize - 1); //creating the x axis.
            var yfft = Array.from(spectrum); //converting from Float64Array to regular array to plot
            console.error(yfft);


            currentCurve = brd.create('curve', [xfft, normal], { line: 2 });

            brd.setBoundingBox([-0.05 * xfft[xfft.length - 1], 1, xfft[xfft.length - 1], -0.1]);

            //
            // f.updateCurve();
            brd.update();
        }
    }
}

class CurrentGraph extends React.Component {
    render() {
        return (
            <JXGBoard
                logic={curveLogic}
                id="board"
                boardAttributes={{ axis: true, boundingbox: [-10, 10, 10, -10] }}
                style={{
                    position: 'fixed',
                    border: "3px solid grey",
                    left: '500px',
                    top: '150px'
                }}
            />
        )
    }
}

class Amplitude1 extends React.Component {
    render() {
        return (
            <input
                type="number"
                id="amp1"
                name="inputbox"
                step="any"
                placeholder="Amplitude 1"
                style={{
                    position: "fixed",
                    left: '100px',
                    top: '400px'
                }}
            />
        )
    }
}

class Amplitude2 extends React.Component {
    render() {
        return (
            <input
                type="number"
                id="amp2"
                name="inputbox"
                step="any"
                placeholder="Amplitude 2"
                style={{
                    position: "fixed",
                    left: '100px',
                    top: '425px'
                }}
            />
        )
    }
}

class Amplitude3 extends React.Component {
    render() {
        return (
            <input
                type="number"
                id="amp3"
                name="inputbox"
                step="any"
                placeholder="Amplitude 3"
                style={{
                    position: "fixed",
                    left: '100px',
                    top: '450px'
                }}
            />
        )
    }
}

class Frequency1 extends React.Component{
    render() {
        return (
            <input
                type="number"
                id="freq1"
                name="inputbox"
                step="any"
                placeholder="Frequency 1"
                min="0"
                style={{
                    position: "fixed",
                    left: '100px',
                    top: '475px'
                }}
            />
        )
    }
}

class Frequency2 extends React.Component {
    render() {
        return (
            <input
                type="number"
                id="freq2"
                name="inputbox"
                step="any"
                placeholder="Frequency 2"
                min="0"
                style={{
                    position: "fixed",
                    left: '100px',
                    top: '500px'
                }}
            />
        )
    }
}

class Frequency3 extends React.Component {
    render() {
        return (
            <input
                type="number"
                id="freq3"
                name="inputbox"
                step="any"
                placeholder="Frequency 3"
                min="0"
                style={{
                    position: "fixed",
                    left: '100px',
                    top: '525px'
                }}
            />
        )
    }
}

class Power extends React.Component {
    render() {
        return (
            <input
                type="number"
                id="pow"
                name="inputbox"
                step="any"
                placeholder="Power"
                min="2"
                max="12"
                defaultValue="4"
                style={{
                    position: "fixed",
                    left: '100px',
                    top: '550px'
                }}
            />
        )
    }
}

class Order extends React.Component {
    render() {
        return (
            <input
                type="number"
                id="order"
                name="inputbox"
                step="any"
                placeholder="Order"
                style={{
                    position: "fixed",
                    left: '100px',
                    top: '575px'
                }}
            />
        )
    }
}

class CutOff extends React.Component {
    render() {
        return (
            <input
                type="number"
                id="cutoff"
                name="inputbox"
                step="any"
                placeholder="Cut Off Frequency"
                style={{
                    position: "fixed",
                    left: '100px',
                    top: '600px'
                }}
            />
        )
    }
}

class WindowSelection extends React.Component {
    render() {
        return (
            <select
                id="windowSelection"
                name="inputbox"
                style={{
                    position: "fixed",
                    left: '100px',
                    top: '350px'
                }}
            >
                <option value={"hamming"}>Hamming</option>
                <option value={"McClellan"}>McClellan</option> //Does nothing right now
            </select>
        )
    }
}

class GraphTypeSelection extends React.Component {
    render() {
        return (
            <select
                id="graphTypeSelection"
                name="inputbox"
                style={{
                    position: "fixed",
                    left: '100px',
                    top: '375px'
                }}
            >
                <option value={"Noisy Sin"}>Noisy Sin</option>
                <option value={"FFT"}>FFT</option> //Does nothing right now
                <option value={"Filter"}>Filter</option>
                <option value={"Window"}>Window</option>
                <option value={"FFT Hamming"}>FFT Hamming</option>
                <option value={"FFT Filter"}>FFT Filter</option>
            </select>
        )
    }
}

const rectangularWindowEquation = `w_{r}[n]x[n+n_{0}]=\\begin{Bmatrix}
0 & n<0\\\\ 
x[n+n_{0}] & 0\\leq n< L\\\\ 
0 & n\\geq l
\\end{Bmatrix}`;

const DTFTofLPFEquation = 'h[n]=\\frac{\\sin (\\hat{\\omega }_{b}n)}{\\pi n}\\; \\; \\; \\; \\; \\; -\\infty < n< \\infty';

const generalWindowEquation = 'H_{L}(e^{j\\widehat{\\omega }})=\\sum_{n=0}^{L-1}w_{L}[n]h[n]e^{-j\\widehat{\\omega }_{k}n}';

const omegaEquation = '\\omega _{k}=(2\\pi /N)k,\\; \\; \\; \\; \\; \\; k=0,1,2,...,N-1';

const hammingWindowEquation = 'w_{m}[n]=\\begin{Bmatrix}\n' +
    '0 & n<0\\\\ \n' +
    '.54-.46\\cos (2\\pi(n)/(L-1)) & 0\\leq n<L\\\\ \n' +
    '0 & n\\geq L\n' +
    '\\end{Bmatrix}';

const cutoffOmegaEquation = '\\widehat{\\omega}_{co}=2\\pi\\frac{f_{co}}{f_{s}}';

let drawEquations = () => {
    return (
        <div
            style={{
                position:'fixed',
                right:'50px',
                top:'125px'
            }}>
            Rectangular Window Equation
            <MathJax.Context input='tex'>
                <div>
                    <MathJax.Node>{rectangularWindowEquation}</MathJax.Node>
                </div>
            </MathJax.Context>
            DTFT of LPF
            <MathJax.Context input='tex'>
                <div>
                    <MathJax.Node>{DTFTofLPFEquation}</MathJax.Node>
                </div>
            </MathJax.Context>
            Window Equation
            <MathJax.Context input='tex'>
                <div>
                    <MathJax.Node>{generalWindowEquation}</MathJax.Node>
                </div>
            </MathJax.Context>
            Omega
            <MathJax.Context input='tex'>
                <div>
                    <MathJax.Node>{omegaEquation}</MathJax.Node>
                </div>
            </MathJax.Context>
            Hamming Window
            <MathJax.Context input='tex'>
                <div>
                    <MathJax.Node>{hammingWindowEquation}</MathJax.Node>
                </div>
            </MathJax.Context>
            Cutoff Omega Equation
            <MathJax.Context input='tex'>
                <div>
                    <MathJax.Node>{cutoffOmegaEquation}</MathJax.Node>
                </div>
            </MathJax.Context>
        </div>
    );
}

class Page extends React.Component {
    render() {
        return(
            <div>
                < CurrentGraph />
                <p></p>
                {/*<WindowSelection/>*/}
                {/*<p></p>*/}
                <GraphTypeSelection/>
                <p></p>
                < Amplitude1 />
                <p></p>
                < Amplitude2 />
                <p></p>
                < Amplitude3 />
                <p></p>
                < Frequency1 />
                <p></p>
                < Frequency2 />
                <p></p>
                < Frequency3 />
                <p></p>
                < Power />
                <p></p>
                < Order/>
                <p></p>
                < CutOff/>
                {drawEquations()}
            </div>
        )
    }
}

ReactDOM.render(
    < Page />,
    document.getElementById('root')
);
serviceWorker.unregister();