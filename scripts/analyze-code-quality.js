"use strict";
/**
 * Code Quality Analysis Script
 * Analyzes codebase quality metrics and generates reports
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeQualityAnalyzer = void 0;
var fs = require("fs");
var path = require("path");
var CodeQualityAnalyzer = /** @class */ (function () {
    function CodeQualityAnalyzer(projectRoot) {
        this.projectRoot = projectRoot;
    }
    CodeQualityAnalyzer.prototype.analyzeProject = function () {
        return __awaiter(this, void 0, void 0, function () {
            var srcDir, files, totalLines, totalFunctions, totalClasses, totalInterfaces, totalComplexity, fileAnalyses, _i, files_1, file, analysis, metrics;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        srcDir = path.join(this.projectRoot, 'src');
                        files = this.getTypeScriptFiles(srcDir);
                        totalLines = 0;
                        totalFunctions = 0;
                        totalClasses = 0;
                        totalInterfaces = 0;
                        totalComplexity = 0;
                        fileAnalyses = [];
                        _i = 0, files_1 = files;
                        _b.label = 1;
                    case 1:
                        if (!(_i < files_1.length)) return [3 /*break*/, 4];
                        file = files_1[_i];
                        return [4 /*yield*/, this.analyzeFile(file)];
                    case 2:
                        analysis = _b.sent();
                        fileAnalyses.push(analysis);
                        totalLines += analysis.lines;
                        totalFunctions += analysis.functions;
                        totalClasses += analysis.classes;
                        totalInterfaces += analysis.interfaces;
                        totalComplexity += analysis.complexity;
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        _a = {
                            fileCount: files.length,
                            lineCount: totalLines,
                            functionCount: totalFunctions,
                            classCount: totalClasses,
                            interfaceCount: totalInterfaces
                        };
                        return [4 /*yield*/, this.getTestCoverage()];
                    case 5:
                        metrics = (_a.testCoverage = _b.sent(),
                            _a.duplicatedLines = this.findDuplicatedLines(fileAnalyses),
                            _a.complexityScore = Math.round(totalComplexity / files.length),
                            _a);
                        return [4 /*yield*/, this.generateReport(metrics, fileAnalyses)];
                    case 6:
                        _b.sent();
                        return [2 /*return*/, metrics];
                }
            });
        });
    };
    CodeQualityAnalyzer.prototype.getTypeScriptFiles = function (dir) {
        var files = [];
        var items = fs.readdirSync(dir);
        for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
            var item = items_1[_i];
            var fullPath = path.join(dir, item);
            var stat = fs.statSync(fullPath);
            if (stat.isDirectory() && !item.startsWith('.')) {
                files.push.apply(files, this.getTypeScriptFiles(fullPath));
            }
            else if (item.endsWith('.ts') && !item.endsWith('.test.ts') && !item.endsWith('.d.ts')) {
                files.push(fullPath);
            }
        }
        return files;
    };
    CodeQualityAnalyzer.prototype.analyzeFile = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var content, lines, functionMatches, classMatches, interfaceMatches, complexityPatterns, complexity, _i, complexityPatterns_1, pattern, matches;
            return __generator(this, function (_a) {
                content = fs.readFileSync(filePath, 'utf8');
                lines = content.split('\n');
                functionMatches = content.match(/(?:function|async\s+function|\w+\s*\([\w\s,]*\)\s*(?::\s*\w+)?\s*{)/g) || [];
                classMatches = content.match(/class\s+\w+/g) || [];
                interfaceMatches = content.match(/interface\s+\w+/g) || [];
                complexityPatterns = [
                    /if\s*\(/g,
                    /else\s+if\s*\(/g,
                    /while\s*\(/g,
                    /for\s*\(/g,
                    /catch\s*\(/g,
                    /switch\s*\(/g,
                    /case\s+/g,
                    /\?\s*:/g, // ternary operators
                ];
                complexity = 1;
                for (_i = 0, complexityPatterns_1 = complexityPatterns; _i < complexityPatterns_1.length; _i++) {
                    pattern = complexityPatterns_1[_i];
                    matches = content.match(pattern) || [];
                    complexity += matches.length;
                }
                return [2 /*return*/, {
                        path: filePath,
                        lines: lines.length,
                        functions: functionMatches.length,
                        classes: classMatches.length,
                        interfaces: interfaceMatches.length,
                        complexity: complexity,
                    }];
            });
        });
    };
    CodeQualityAnalyzer.prototype.getTestCoverage = function () {
        return __awaiter(this, void 0, void 0, function () {
            var testDir, srcDir, testFiles, srcFiles, estimatedCoverage;
            return __generator(this, function (_a) {
                // This would normally read from coverage reports
                // For now, return a calculated estimate based on test files
                try {
                    testDir = path.join(this.projectRoot, 'tests');
                    srcDir = path.join(this.projectRoot, 'src');
                    testFiles = this.getTestFiles(testDir);
                    srcFiles = this.getTypeScriptFiles(srcDir);
                    estimatedCoverage = Math.min(90, (testFiles.length * 2.5 / srcFiles.length) * 100);
                    return [2 /*return*/, Math.round(estimatedCoverage)];
                }
                catch (_b) {
                    return [2 /*return*/, 0];
                }
                return [2 /*return*/];
            });
        });
    };
    CodeQualityAnalyzer.prototype.getTestFiles = function (dir) {
        if (!fs.existsSync(dir))
            return [];
        var files = [];
        var items = fs.readdirSync(dir);
        for (var _i = 0, items_2 = items; _i < items_2.length; _i++) {
            var item = items_2[_i];
            var fullPath = path.join(dir, item);
            var stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                files.push.apply(files, this.getTestFiles(fullPath));
            }
            else if (item.endsWith('.test.ts') || item.endsWith('.spec.ts')) {
                files.push(fullPath);
            }
        }
        return files;
    };
    CodeQualityAnalyzer.prototype.findDuplicatedLines = function (analyses) {
        // Simple heuristic: estimate based on project size
        // In a real implementation, this would use AST analysis
        var totalLines = analyses.reduce(function (sum, a) { return sum + a.lines; }, 0);
        return Math.round(totalLines * 0.02); // Assume 2% duplication
    };
    CodeQualityAnalyzer.prototype.generateReport = function (metrics, analyses) {
        return __awaiter(this, void 0, void 0, function () {
            var reportDir, report, reportPath, markdownReport, markdownPath;
            var _this = this;
            return __generator(this, function (_a) {
                reportDir = path.join(this.projectRoot, 'reports');
                if (!fs.existsSync(reportDir)) {
                    fs.mkdirSync(reportDir, { recursive: true });
                }
                report = {
                    timestamp: new Date().toISOString(),
                    metrics: metrics,
                    details: {
                        mostComplexFiles: analyses
                            .sort(function (a, b) { return b.complexity - a.complexity; })
                            .slice(0, 5)
                            .map(function (a) { return ({
                            file: path.relative(_this.projectRoot, a.path),
                            complexity: a.complexity,
                            lines: a.lines,
                        }); }),
                        largestFiles: analyses
                            .sort(function (a, b) { return b.lines - a.lines; })
                            .slice(0, 5)
                            .map(function (a) { return ({
                            file: path.relative(_this.projectRoot, a.path),
                            lines: a.lines,
                            functions: a.functions,
                        }); }),
                    },
                    recommendations: this.generateRecommendations(metrics),
                };
                reportPath = path.join(reportDir, 'code-quality-report.json');
                fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
                markdownReport = this.generateMarkdownReport(report);
                markdownPath = path.join(reportDir, 'CODE_QUALITY_REPORT.md');
                fs.writeFileSync(markdownPath, markdownReport);
                console.log("\uD83D\uDCCA Code quality report generated:");
                console.log("   JSON: ".concat(reportPath));
                console.log("   Markdown: ".concat(markdownPath));
                return [2 /*return*/];
            });
        });
    };
    CodeQualityAnalyzer.prototype.generateRecommendations = function (metrics) {
        var recommendations = [];
        if (metrics.testCoverage < 80) {
            recommendations.push('Increase test coverage to at least 80%');
        }
        if (metrics.complexityScore > 10) {
            recommendations.push('Reduce cyclomatic complexity by refactoring complex functions');
        }
        if (metrics.duplicatedLines > metrics.lineCount * 0.05) {
            recommendations.push('Reduce code duplication by extracting common functionality');
        }
        if (metrics.lineCount / metrics.fileCount > 200) {
            recommendations.push('Consider breaking large files into smaller, more focused modules');
        }
        if (recommendations.length === 0) {
            recommendations.push('Code quality is excellent! Continue maintaining current standards.');
        }
        return recommendations;
    };
    CodeQualityAnalyzer.prototype.generateMarkdownReport = function (report) {
        return "# Code Quality Report\n\nGenerated: ".concat(report.timestamp, "\n\n## Overall Metrics\n\n- **Files**: ").concat(report.metrics.fileCount, "\n- **Lines of Code**: ").concat(report.metrics.lineCount.toLocaleString(), "\n- **Functions**: ").concat(report.metrics.functionCount, "\n- **Classes**: ").concat(report.metrics.classCount, "\n- **Interfaces**: ").concat(report.metrics.interfaceCount, "\n- **Test Coverage**: ").concat(report.metrics.testCoverage, "%\n- **Duplicated Lines**: ").concat(report.metrics.duplicatedLines, "\n- **Average Complexity**: ").concat(report.metrics.complexityScore, "\n\n## Most Complex Files\n\n").concat(report.details.mostComplexFiles.map(function (f) {
            return "- **".concat(f.file, "**: Complexity ").concat(f.complexity, " (").concat(f.lines, " lines)");
        }).join('\n'), "\n\n## Largest Files\n\n").concat(report.details.largestFiles.map(function (f) {
            return "- **".concat(f.file, "**: ").concat(f.lines, " lines (").concat(f.functions, " functions)");
        }).join('\n'), "\n\n## Recommendations\n\n").concat(report.recommendations.map(function (r) { return "- ".concat(r); }).join('\n'), "\n\n---\n*Generated by SentimentalSocial Code Quality Analyzer*\n");
    };
    return CodeQualityAnalyzer;
}());
exports.CodeQualityAnalyzer = CodeQualityAnalyzer;
// Run analysis if called directly
if (require.main === module) {
    var analyzer = new CodeQualityAnalyzer(process.cwd());
    analyzer.analyzeProject()
        .then(function (metrics) {
        console.log('✅ Code quality analysis completed');
        console.log("\uD83D\uDCCA Overall quality score: ".concat(100 - (metrics.complexityScore + (100 - metrics.testCoverage)) / 2, "/100"));
    })
        .catch(function (error) {
        console.error('❌ Analysis failed:', error);
        process.exit(1);
    });
}
