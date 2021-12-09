import { boardService } from '../services/boardService.js';
import { utilService } from '../services/utilService.js';
import {
  socketService,
  SOCKET_EVENT_WATCHBOARD,
  SOCKET_EMIT_UPDATEBOARD,
  SOCKET_EVENT_UPDATEDBOARD,
} from '../services/socketService';

export const boardStore = {
  strict: true,
  state: {
    currBoard: null,
    boards: [],
    currTask: {},
    currGroup: {},
    filterBy: { keyWord: '', members: [], dueDate: null, labels: [] },
    newGroup: {},
    newTask: {},
    newChecklist: {},
    newTodo: {},
    // newId: utilService.makeId(),
  },
  getters: {
    // getNewId({ newId }) {
    //   return newId;
    // },
    getEmptyTodo({ newTodo }) {
      return newTodo;
    },
    getEmptyTask({ newTask }) {
      return newTask;
    },
    getEmptyGroup({ newGroup }) {
      return newGroup;
    },
    getCurrTask({ currTask }) {
      return currTask;
    },
    getCurrGroup({ currGroup }) {
      return currGroup;
    },
    getCurrBoard({ currBoard }) {
      return currBoard;
    },
    boards({ boards }) {
      return boards;
    },
  },
  mutations: {
    // generateNewId(state) {
    //   state.newId = utilService.makeId();
    // },
    setBoards(state, { boards }) {
      state.boards = boards;
    },
    setCurrBoard(state, { board }) {
      state.currBoard = board;
    },
    updateBoard(state, { board }) {
      if (board._id === state.currBoard._id) {
        state.currBoard = board;
        if (state.currBoard.groups.length)
          state.currBoard.groups.forEach((group) => {
            if (group.id === state.currGroup.id) state.currGroup = group;
          });
        if (state.currGroup.tasks)
          state.currGroup.tasks.forEach((task) => {
            if (task.id === state.currTask.id) state.currTask = task;
          });
      }
    },
    removeBoard(state, { boardId }) {
      let idx = state.boards.findIndex((board) => board._Id === boardId);
      state.boards.splice(idx, 1);
    },
    addGroup(state, { group }) {
      let newGroup = boardService.getEmptyGroup();
      newGroup.title = group.title;
      state.currBoard.groups.push(newGroup);
      this.newGroup = boardService.getEmptyGroup();
    },
    async createBoard(state, { board, user }) {
      try {
        let emptyBoard = boardService.getEmptyBoard();
        emptyBoard.createdBy = user;
        emptyBoard.title = board.title;
        if (board.imgUrl) {
          emptyBoard.style.backgroundUrl = board.imgUrl;
        }
        if (!board.background)
          emptyBoard.style.backgroundColor = 'rgb(0, 121, 191)';
        else emptyBoard.style.backgroundColor = board.background;
        let newBoard = await boardService.add(emptyBoard);
        if (!state.boards.length) state.boards = [];
        state.boards.push(newBoard);
      } catch (err) {
        console.log('Couldnt create board', err);
      }
    },
    addActivity(state, { activity }) {
      let newActivity = boardService.getEmptyActivity();
      newActivity.txt = activity.txt;
      newActivity.byMember = activity.user;
      newActivity.task.id = activity.task.id;
      newActivity.task.title = activity.task.title;

      if (activity.res) {
        newActivity.imgUrl = activity.res.url;
      }
      state.currBoard.activities.unshift(newActivity);
    },
    createLabel(state, { label }) {
      if (label.id) {
        let idx = state.currBoard.labels.findIndex(
          (currLabel) => currLabel.id === label.id
        );
        state.currBoard.labels[idx] = label;
      } else {
        let newLabel = boardService.getEmptyLabel();
        newLabel.title = label.title;
        newLabel.color = label.selectedColor;
        state.currBoard.labels.push(newLabel);
        state.currTask.labelIds.push(newLabel.id);
      }
    },
    deleteLabel(state, label) {
      let boardIdx = state.currBoard.labels.findIndex(
        (currLabel) => currLabel.id === label.id
      );
      state.currBoard.labels.splice(boardIdx, 1);
      let taskIdx = state.currTask.labelIds.findIndex(
        (currLabel) => currLabel.id === label.id
      );
      state.currTask.labelIds.splice(taskIdx, 1);
    },
    addTask(state, { taskRaw }) {
      let newTask = boardService.getEmptyTask();
      newTask.title = taskRaw.task;
      newTask.byMember = taskRaw.user;
      console.log(newTask);
      let idx = state.currBoard.groups.findIndex(
        (group) => group.id === taskRaw.groupId
      );
      state.currBoard.groups[idx].tasks.push(newTask);
    },
    getDetails(state, { boardId, taskId, groupId }) {
      console.log(boardId);
      let boardIdx = state.boards.findIndex((board) => board._id === boardId);
      console.log('BoardIdx', boardIdx);
      state.currBoard = state.boards[boardIdx];
      let idx = state.currBoard.groups.findIndex(
        (group) => group.id === groupId
      );
      console.log('idx', idx);
      state.currGroup = state.currBoard.groups[idx];
      state.currTask = state.currGroup.tasks.find((task) => task.id === taskId);
    },
    updateGroup(state, { group }) {
      const idx = state.currBoard.groups.findIndex(
        (currGroup) => currGroup.id === group.id
      );
      state.currBoard.groups.splice(idx, 1, group);
      state.currGroup = state.currBoard.groups[idx];
    },
    updateTask(state, { task }) {
      const idx = state.currBoard.groups.findIndex(
        (currGroup) => currGroup.id === state.currGroup.id
      );
      const taskIdx = state.currBoard.groups[idx].tasks.findIndex(
        (currTask) => currTask.id === task.id
      );
      state.currBoard.groups[idx].tasks.splice(taskIdx, 1, task);
      state.currTask = task;
    },
    removeTask(state, { task }) {
      let idx = state.currGroup.tasks.findIndex(
        (currTask) => currTask.id === task.id
      );
      state.currGroup.tasks.splice(idx, 1);
    },
    removeGroup(state, { groupId }) {
      let idx = state.currBoard.groups.findIndex(
        (currGroup) => currGroup.id === groupId
      );
      state.currBoard.groups.splice(idx, 1);
    },
    addBoard(state, { board }) {
      // if (!state.boards.length) state.boards = [];
      state.boards.push(board);
    },
    applyDrag(state, { content }) {
      if (
        content.dropResult.removedIndex === null &&
        content.dropResult.addedIndex === null
      )
        return;
      const { removedIndex, addedIndex, payload } = content.dropResult;
      const idx = content.groupIdx;
      const result = [...state.currBoard.groups[idx].tasks];
      let itemToAdd = payload;
      if (removedIndex !== null) {
        itemToAdd = result.splice(removedIndex, 1)[0];
      }
      if (addedIndex !== null) {
        result.splice(addedIndex, 0, itemToAdd);
      }
      state.currBoard.groups[idx].tasks = [...result];
    },
  },
  actions: {
    async loadBoards({ commit }) {
      try {
        const boards = await boardService.query();
        commit({ type: 'setBoards', boards });
      } catch (err) {
        console.log('Couldnt load boards', err);
      }
    },
    async loadAndWatchBoard({ commit }, { boardId }) {
      try {
        const board = await boardService.getBoardById(boardId);
        console.log(board);
        commit({ type: 'setCurrBoard', board });
        // socketService.off(SOCKET_EVENT_WATCHBOARD);
        // socketService.on(SOCKET_EVENT_WATCHBOARD, (board) => {
        //   console.log('Board changed from socket', board);
        //   commit({ type: 'updateBoard', board });
        // });
        socketService.emit(SOCKET_EVENT_WATCHBOARD, boardId)
        socketService.off(SOCKET_EVENT_UPDATEDBOARD);
        socketService.on(SOCKET_EVENT_UPDATEDBOARD, (updatedBoard) => {
          console.log('im on socket event updatedboard', updatedBoard);
          commit({ type: 'updateBoard', board: updatedBoard });
        });
      } catch (err) {
        console.log('Couldnt load board', err);
      }
    },
    async addBoard({ commit }, board) {
      try {
        await boardService.add(board);
        commit({ type: 'addBoard', board });
      } catch (err) {
        console.log("Couldn't add board", err);
      }
    },
    async updateBoard({ state, commit }, { board = null }) {
      try {
        if (!board) board = state.currBoard;
        let newBoard = await boardService.update(board);
        commit({ type: 'updateBoard', board:newBoard });
        socketService.emit(SOCKET_EMIT_UPDATEBOARD, newBoard);
      } catch (err) {
        console.log('Couldnt update Board', err);
      }
    },
    async removeBoard({ commit }, { boardId }) {
      try {
        await boardService.remove(boardId);
        commit({ type: 'removeBoard', boardId });
        //SOCKET FOR DELETING MIGHT BE NEEDED
      } catch (err) {
        console.log("Couldn't remove board", err);
      }
    },
    async removeGroup({ dispatch, commit }, { groupId }) {
      try {
        commit({ type: 'removeGroup', groupId });
        let board = null; //not sure if its needed
        await dispatch({ type: 'updateBoard' }, board);
      } catch (err) {
        console.log("Coulnd't remove group", err);
      }
    },
    async updateGroup({ dispatch, commit }, { group }) {
      try {
        commit({ type: 'updateGroup', group });
        await dispatch({ type: 'updateBoard' });
      } catch (err) {}
    },
    async addGroup({ dispatch, commit }, { group }) {
      try {
        commit({ type: 'addGroup', group });
        await dispatch({ type: 'updateBoard' });
      } catch (err) {
        console.log('couldnt update in addgroup', err);
      }
    },
    async addTask({ dispatch, commit }, { taskRaw }) {
      try {
        await commit({ type: 'addTask', taskRaw });
        await dispatch({ type: 'updateBoard' });
      } catch (err) {
        console.log('Couldnt add a task', err);
      }
    },
    async removeTask({ dispatch, commit }, { task }) {
      try {
        commit({ type: 'removeTask', task });
        await dispatch({ type: 'updateBoard' });
      } catch (err) {
        console.log('Error on board store REMOVETASK', err);
      }
    },
    async getTaskDetails({ commit }, { boardId, taskId, groupId }) {
      try {
        commit({ type: 'getDetails', boardId, taskId, groupId });
      } catch (err) {
        console.log('Error on board store GETTASKDETAILS', err);
      }
    },
    async updateTask({ commit, dispatch }, { task }) {
      try {
        commit({ type: 'updateTask', task });
        await dispatch({ type: 'updateBoard' });
      } catch (err) {
        console.log('Error on board store UPDATETASK', err);
      }
    },
    async createLabel({ dispatch, commit }, { label }) {
      try {
        commit({ type: 'createLabel', label });
        await dispatch({ type: 'updateBoard' });
      } catch (err) {
        console.log('Error on board store CREATELABEL');
      }
    },
    async deleteLabel({ dispatch, commit }, { label }) {
      try {
        commit({ type: 'deleteLabel', label });
        await dispatch({ type: 'updateBoard' });
      } catch (err) {
        console.log('Error on board soter DELETELABEL');
      }
    },
    async addActivity({ dispatch, commit }, { activity }) {
      try {
        commit({ type: 'addActivity', activity });
        dispatch({ type: 'updateBoard' });
      } catch (err) {
        console.log('Error on board store ADDACTIVITY', err);
      }
    },
    async createBoard({ dispatch, commit }, { board }) {
      try {
        let emptyBoard = boardService.getEmptyBoard();
        // emptyBoard.createdBy = user;
        emptyBoard.title = board.title;
        if (board.imgUrl) {
          emptyBoard.style.backgroundUrl = board.imgUrl;
        }
        if (!board.background)
          emptyBoard.style.backgroundColor = 'rgb(0, 121, 191)';
        else emptyBoard.style.backgroundColor = board.background;
        let newBoard = await boardService.add(emptyBoard);
        console.log(newBoard);
        commit({ type: 'addBoard', board: newBoard });
        console.log('now im here');
      } catch (err) {
        console.log('Error on board store CREATEBOARD');
      }
    },
    async applyDrag({ dispatch, commit }, { content }) {
      commit({ type: 'applyDrag', content });
      await dispatch({ type: 'updateBoard' });
    },
  },
};
