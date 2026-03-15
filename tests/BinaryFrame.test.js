import BinaryFrame from '../public/js/BinaryFrame.js';

describe('BinaryFrame', () => {
	describe('encode and parse', () => {
		it('should correctly round-trip a basic frame for version 3', () => {
			const original = {
				game_type: BinaryFrame.GAME_TYPE.CLASSIC,
				gameid: 12345,
				ctime: Math.floor(Date.now() / 1000) & 0xfffffff, // 28 bits max
				lines: 125,
				level: 18,
				score: 550000,
				instant_das: 12,
				preview: 'T',
				cur_piece_das: 8,
				cur_piece: 'J',
				T: 15,
				J: 12,
				Z: 10,
				O: 22,
				S: 25,
				L: 18,
				I: 33,
				field: Array.from({ length: 200 }, (_, i) => i % 3), // some non-zeros
			};

			const buffer = BinaryFrame.encode(original);

			// Version 3 size is 73
			expect(buffer.length).toBe(73);

			const parsed = BinaryFrame.parse(buffer);

			expect(parsed.version).toBe(3);
			expect(parsed.game_type).toBe(original.game_type);
			expect(parsed.gameid).toBe(original.gameid);
			expect(parsed.ctime).toBe(original.ctime);
			expect(parsed.lines).toBe(original.lines);
			expect(parsed.level).toBe(original.level);
			expect(parsed.score).toBe(original.score);
			expect(parsed.instant_das).toBe(original.instant_das);
			expect(parsed.preview).toBe(original.preview);
			expect(parsed.cur_piece_das).toBe(original.cur_piece_das);
			expect(parsed.cur_piece).toBe(original.cur_piece);

			// Piece distributions
			expect(parsed.T).toBe(original.T);
			expect(parsed.J).toBe(original.J);
			expect(parsed.Z).toBe(original.Z);
			expect(parsed.O).toBe(original.O);
			expect(parsed.S).toBe(original.S);
			expect(parsed.L).toBe(original.L);
			expect(parsed.I).toBe(original.I);

			// Compare arrays via jest deep equality
			expect(parsed.field).toEqual(original.field);
		});

		it('should handle nullable fields correctly', () => {
			const originalWithNulls = {
				game_type: BinaryFrame.GAME_TYPE.CLASSIC,
				gameid: 54321,
				ctime: 1234567,
				lines: null,
				level: null,
				score: null,
				instant_das: null,
				preview: null,
				cur_piece_das: null,
				cur_piece: null,
				T: null,
				J: null,
				Z: null,
				O: null,
				S: null,
				L: null,
				I: null,
				field: Array(200).fill(0),
			};

			const buffer = BinaryFrame.encode(originalWithNulls);
			const parsed = BinaryFrame.parse(buffer);

			expect(parsed.score).toBeNull();
			expect(parsed.lines).toBeNull();
			expect(parsed.level).toBeNull();
			expect(parsed.instant_das).toBeNull();
			expect(parsed.preview).toBeNull();
			expect(parsed.cur_piece_das).toBeNull();
			expect(parsed.cur_piece).toBeNull();
			expect(parsed.T).toBeNull();
			expect(parsed.J).toBeNull();
			expect(parsed.Z).toBeNull();
			expect(parsed.O).toBeNull();
			expect(parsed.S).toBeNull();
			expect(parsed.L).toBeNull();
			expect(parsed.I).toBeNull();
		});

		it('should extract ctime without parsing the whole structure', () => {
			const ctime = 9876543;
			const original = {
				game_type: BinaryFrame.GAME_TYPE.CLASSIC,
				gameid: 1111,
				ctime, // test target
				lines: 10,
				level: 1,
				score: 1000,
				instant_das: 1,
				preview: 'Z',
				cur_piece_das: 1,
				cur_piece: 'O',
				T: 1,
				J: 1,
				Z: 1,
				O: 1,
				S: 1,
				L: 1,
				I: 1,
				field: Array(200).fill(0),
			};

			const buffer = BinaryFrame.encode(original);

			// extract ctime directly from the static method
			const extractedCTime = BinaryFrame.getCTime(buffer);

			expect(extractedCTime).toBe(ctime);
		});

		it('should throw an error for unsupported format versions', () => {
			const buffer = new Uint8Array(200);
			// fake version 7 (0b111 << 5)
			buffer[0] = 7 << 5;

			expect(() => {
				BinaryFrame.parse(buffer);
			}).toThrow(/Invalid Frame: Version not supported/);
		});

		it('should throw an error for buffers that are too long', () => {
			// Version 3 max is 73. So let's make it 80
			const buffer = new Uint8Array(80);
			// set valid version 3
			buffer[0] = 3 << 5;

			expect(() => {
				BinaryFrame.parse(buffer);
			}).toThrow(/Invalid frame: too long/);
		});

		it('should throw an error for buffers that are too short', () => {
			// POSSBLE_RIGHT_PADDING is 51, so 73 - 51 = 22.
			// 10 is shorter than the minimum threshold.
			const buffer = new Uint8Array(10);
			// set valid version 3
			buffer[0] = 3 << 5;

			expect(() => {
				BinaryFrame.parse(buffer);
			}).toThrow(/Invalid frame: too short/);
		});

		it('should pad short buffers if they fall within right padding threshold', () => {
			// 73 - 50 = 23 length buffer
			const buffer = new Uint8Array(23);
			buffer[0] = 3 << 5; // v3

			// We won't test full equality here because the rest of the buffer is 0s
			// but we want to make sure it doesn't throw and correctly pads it to 73 internally
			const parsed = BinaryFrame.parse(buffer);

			expect(parsed.version).toBe(3);
			// All fields should be 0 (the default missing array values)
			expect(parsed.field.every(val => val === 0)).toBe(true);
		});
	});
});
