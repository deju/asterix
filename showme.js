//var fs = require("fs");
//functions = JSON.parse(fs.readFileSync("small.json")).functions

functions = JSON.parse(contract).functions;

/*

	helper functions	

*/

Array.prototype.extend = function (other_array) {
    /* You should include a test to check whether other_array really is an array */
    other_array.forEach(function(v) {this.push(v)}, this);
}

function opcode(exp) {
	if (typeof exp == "object") {
		return exp[0]
	} else {
		return null
	}
}

function is_zero(exp) {
	return ['ISZERO', exp]
}

function simplify(exp) {
	if ((opcode(exp) == 'ISZERO') && (opcode(exp[1]) == 'ISZERO')) {
		return simplify(exp[1][1])
	} else {

		if ((typeof x == 'object') || (typeof x == 'array')) {
			res = Array()
			for (x of exp) {
				res.push(simplify(x))
			}
			return res
		
		} else {
			return exp
		
		}
	}
}

//console.log(simplify(['IS_ZERO', ['IS_ZERO', 'abc']]))

function walk_trace(trace, f, knows_true=null) {
	res = Array()
	knows_true = knows_true?knows_true:Array()

	for (line of trace) {
		res.extend(f(line, knows_true))//.extend(res)
		
		if (opcode(line) == 'IF') {

            condition = line[1]
            if_true = line[2]
            if_false = line[3]

            res = res.concat(walk_trace(if_true, f, knows_true.concat([condition])))
            res = res.concat(walk_trace(if_false, f, knows_true.concat([is_zero(condition)])))

            break
		}
	}
	return res
}

/*
	the code
*/

function get_caller_cond(condition) {
	/*
    #  checks if the condition has this format:
    #  (EQ (MASK_SHL, 160, 0, 0, 'CALLER'), (STORAGE, size, offset, stor_num))

    #  if it does, returns the storage data
    #
    #  also, if condition is IS_ZERO(EQ ...), it turns it into just (EQ ...)
    #  -- technically not correct, but this is a hackathon project, should be good enough :)
    */

    condition = simplify(condition)

    if (opcode(condition) != 'EQ')
        return null

    if (condition[1].toString() == ['MASK_SHL', 160, 0, 0, 'CALLER'].toString())
        stor = condition[2]
    else if (condition[2].toString() == ['MASK_SHL', 160, 0, 0, 'CALLER'].toString())
        stor = condition[1]
    else
        return null

    if (opcode(stor) == 'MASK_SHL') {
    	stor = stor[4]
    }

    if (opcode(stor) == 'STORAGE' && stor.length == 4)
        return stor
    else if (typeof stor == 'number')
        return '0x' + stor.toString(16)
    else
        return 'unknown'
}

function find_destructs(line, knows_true) {
    if (opcode(line) != 'SELFDESTRUCT') //'SELFDESTRUCT':
        return Array()

    /*receiver = line[1]

    if (receiver.toString == ('MASK_SHL', 160, 0, 0, 'CALLER').toString):
        receiver = 'anyone'
    else if (opcode(receiver) != 'STORAGE' || len(receiver) > 4):
        receiver = 'unknown'*/

    callers = Array()
    for (cond of knows_true) {
    	cond = simplify(cond)
        caller = get_caller_cond(cond)

        if (caller) {
            callers.push(caller)
        }
    }

    if (callers.length == 0) 
    	return [ knows_true ]
   	else
   		return Array() //[ knows_true ]
/*        callers = ['anyone']

    return callers*/
}



function test(exp, knows_true) {
    return [ [opcode(exp), knows_true] ]
}

//functions = trace.functions


output = Array()

for (func of functions) {
	trace = func.trace
	res = walk_trace(trace, find_destructs)
	if (res.length > 0) {
		console.log(func.color_name)
		console.log(res)
		output.push(JSON.stringify({
			'func_name': func.name,
//			'print': func.print,
			'res': res
		}))
	}
}

//res = walk_trace(trace, find_destructs)

//console.log('hello')
//console.log(typeof res)
//console.log(res)

//if (output.length > 0) {
	return output //JSON.stringify(output)
//} else {
//	return null
//}

//console.log(['a','b'].extend(['c', 'd']))

//console.log(['a','b','c'].toString() == ['a','b','c'].toString())

//return JSON.parse(fs)[0].hash

/*
def walk_trace(trace, f=print, knows_true=None):
    '''
        
        walks the trace, calling function f(line, knows_true) for every line
        knows_true is a list of 'if' conditions that had to be met to reach a given
        line

    '''
    res = []
    knows_true = knows_true or []

    for idx, line in enumerate(trace):
        found = f(line, knows_true)

        if found is not None:
            res.append(found)

        if opcode(line) == 'IF':
            condition, if_true, if_false = line[1:]
            res.extend(walk_trace(if_true, f, knows_true + [condition]))
            res.extend(walk_trace(if_false, f, knows_true + [is_zero(condition)]))

            assert idx == len(trace)-1, trace # IFs always end the trace tree
            break

        if opcode(line) == 'WHILE':
            condition, while_trace = line[1:]
            res.extend(walk_trace(while_trace, f, knows_true + [is_zero(condition)]))
            continue

        if opcode(line) == 'LOOP':
            loop_trace, label = line[1:]
            res.extend(walk_trace(loop_trace, f, knows_true))

    return res
*/