import mongoose from 'mongoose';
const ResultSchema = new mongoose.Schema({
    matches: []
  });
const TableSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
          },
        organiser: {
            type: String,
            required: [true, 'enter the organiser name']
        }
        , tourneyname: {
            type: String,
            required: [true, "enter the tourney name"]
        },
        KillPoints: {
            type: Number,
            required: [true, "enter the No.of Matches"]
        },
        placepoints: [Number],
        Teams: {
            type: [String],
            required: true
          },
        Match: [ResultSchema],
        //Overall: {
//
        //},
        //showcards: { type: Boolean }
    }, { timestamps: true }
)
const Table = mongoose.model('Table',TableSchema);

export default Table;