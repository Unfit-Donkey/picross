#include <iostream>
#include <cstdlib>
#include <string>
#include <cstring>
#include <emscripten.h>
#include <emscripten/bind.h>

using namespace std;
typedef enum Cell : char {
    unsure = 0, broken = 1, painted = 2
} Cell;
typedef struct Hint {
    unsigned char total;
    unsigned char gapCount;
} Hint;
class Puzzle {
public:
    string name;
    int dimension;
    int* size = NULL;
    Cell* shape = NULL;
    Hint* hints = NULL;
private:
    int maxFaceSize;
    int shapeSize;
public:
    Puzzle(int dim, int* siz, string nam) {
        dimension = dim;
        free(size);
        size = (int*)calloc(dim, sizeof(int));
        memcpy(size, siz, dim * sizeof(int));
        name = nam;
        int minimumRowLength = 10000;
        shapeSize = 1;
        for(int i = 0;i < dim;i++) {
            shapeSize *= size[i];
            if(size[i] < minimumRowLength) size[i] = minimumRowLength;
        }
        maxFaceSize = shapeSize / minimumRowLength;
        free(shape);
        shape = (Cell*)calloc(shapeSize, sizeof(Cell));
    }
    string toString() {
        // NAME~DIMENSION~SIZE~SHAPE~HINTS
        string out = name + "~" + std::to_string(dimension) + "~";
        for(int i = 0;i < dimension;i++) {
            out += ('A' + size[i]);
        }
        //Shape
        out += "~";
        for(int i = 0;i < shapeSize;i++) {
            if(shape[i] == broken) out += " ";
            else if(shape[i] == unsure) out += "-";
            else if(shape[i] == painted) out += "+";
        }
        //Hints
        out += "~";
        for(int i = 0;i < maxFaceSize * dimension;i++) {
            out += ('A' + hints[i].total) + ('A' + hints[i].gapCount);
        }
        return out;
    }
    void fromString(string str) {
        string strs[10];
        int currentIndex = 0;
        int i = 0;
        //Split by tildes
        int lastTilde = -1;
        for(int i = 0;i < str.size() + 1;i++) {
            if(str[i] == '~' || str[i] == 0) {
                strs[i] = "";
                strs[i].append(str, lastTilde + 1, i - lastTilde - 1);
                lastTilde = i;
            }
        }
        //Set name
        name = strs[0];
        //Dimension and size
        dimension = atoi(strs[1].c_str());
        free(size);
        size = (int*)calloc(dimension, sizeof(int));
        for(int i = 0;i < strs[2].size();i++) size[i] = strs[2][i] - 'A';
        //Reconstruct shape size
        int minimumRowLength = 10000;
        shapeSize = 1;
        for(int i = 0;i < dimension;i++) {
            shapeSize *= size[i];
            if(size[i] < minimumRowLength) size[i] = minimumRowLength;
        }
        maxFaceSize = shapeSize / minimumRowLength;
        //Copy shape
        free(shape);
        shape = (Cell*)calloc(strs[3].size(), sizeof(Cell));
        for(int i = 0;i < strs[3].size();i++) {
            if(strs[3][i] == ' ') shape[i] = broken;
            else if(strs[3][i] == '-') shape[i] = unsure;
            else if(strs[3][i] == '+') shape[i] = painted;
        }
        //Copy hints
        free(hints);
        hints = (Hint*)calloc(dimension * maxFaceSize, sizeof(Hint));
        for(int i = 0;i < strs[4].size();i += 2) {
            hints[i].total = strs[4][i] - 'A';
            hints[i].gapCount = strs[4][i + 1] - 'A';
        }
    }
    int collapsePosition(int* position) {
        int sliceSize = 1;
        int out = 0;
        for(int i = 0;i < dimension;i++) {
            out += position[i] * sliceSize;
            sliceSize *= size[i];
        }
        return out;
    }
    Cell getCell(int* position) {
        return shape[collapsePosition(position)];
    }
    Hint getHint(int* position, int dimension) {


    }
    void setCell(int* position, Cell set) {
        shape[collapsePosition(position)] = set;
    }
    void getRow(int* position, int dimension, Cell* out) {
        int rowLength = size[dimension];
        int spacing = 1;
        for(int i = 0;i < dimension;i++) spacing *= size[i];
        position[dimension] = 0;
        int firstCell = collapsePosition(position);
        for(int i = 0;i < rowLength;i++) {
            out[i] = shape[firstCell + spacing * i];
        }
    }
    void setRow(int* position, int dimension, Cell* cells) {
        int rowLength = size[dimension];
        int spacing = 1;
        for(int i = 0;i < dimension;i++) spacing *= size[i];
        position[dimension] = 0;
        int firstCell = collapsePosition(position);
        for(int i = 0;i < rowLength;i++) {
            shape[firstCell + spacing * i] = cells[i];
        }
    }
    int solveRow(int* position, int dimension) {
        position[dimension] = 0;
        int changeCount = 0;
        //Get row
        Cell row[size[dimension] + 1];
        getRow(position, dimension, row);
        row[size[dimension]] = broken;
        //Magic *stars*
        int firstCell = collapsePosition(position);
        Hint hint = hints[firstCell];


        //Set row
        setRow(position, dimension, row);
        return changeCount;
    }
};
